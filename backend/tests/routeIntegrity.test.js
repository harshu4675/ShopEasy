const test = require("node:test");
const assert = require("node:assert/strict");

const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const cloudinary = require("../config/cloudinary");
const productRouter = require("../routes/products");
const cartRouter = require("../routes/cart");
const publicCacheControl = require("../middleware/cacheControl");

function handlerFor(router, path, method) {
  const layer = router.stack.find(
    (entry) => entry.route?.path === path && entry.route.methods[method],
  );
  assert.ok(layer, `Missing ${method.toUpperCase()} ${path}`);
  return layer.route.stack.at(-1).handle;
}

function response() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    set(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
  };
}

function populatedQuery(value) {
  const promise = Promise.resolve(value);
  return {
    populate() {
      return this;
    },
    then(resolve, reject) {
      return promise.then(resolve, reject);
    },
  };
}

test("product cache policy revalidates public product GET responses", () => {
  const productResponse = response();
  let nextCalls = 0;
  publicCacheControl(
    { method: "GET", path: "/api/products/abc", headers: {} },
    productResponse,
    () => {
      nextCalls += 1;
    },
  );
  assert.equal(
    productResponse.headers["cache-control"],
    "public, no-cache, must-revalidate",
  );
  assert.equal(nextCalls, 1);

  const referenceResponse = response();
  publicCacheControl(
    { method: "GET", path: "/api/categories", headers: {} },
    referenceResponse,
    () => {},
  );
  assert.equal(
    referenceResponse.headers["cache-control"],
    "public, max-age=60, stale-while-revalidate=300",
  );

  const privateResponse = response();
  publicCacheControl(
    {
      method: "GET",
      path: "/api/products/abc",
      headers: { authorization: "Bearer test" },
    },
    privateResponse,
    () => {},
  );
  assert.equal(privateResponse.headers["cache-control"], undefined);
});

test("malformed product option JSON returns 400 without saving", async () => {
  const originalFindById = Product.findById;
  const originalError = console.error;
  let saves = 0;
  Product.findById = async () => ({
    async save() {
      saves += 1;
    },
  });
  console.error = () => {};

  try {
    const res = response();
    await handlerFor(
      productRouter,
      "/:id",
      "put",
    )(
      {
        params: { id: "product-1" },
        body: { sizes: "[not-json" },
        files: [],
      },
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Invalid sizes/);
    assert.equal(saves, 0);

    const nonArray = response();
    await handlerFor(
      productRouter,
      "/:id",
      "put",
    )(
      {
        params: { id: "product-1" },
        body: { colors: '{"name":"Blue"}' },
        files: [],
      },
      nonArray,
    );
    assert.equal(nonArray.statusCode, 400);
    assert.match(nonArray.body.message, /Invalid colors/);
    assert.equal(saves, 0);
  } finally {
    Product.findById = originalFindById;
    console.error = originalError;
  }
});

test("delete route removes the database record and a repeat delete stays 404", async () => {
  const originalProductDelete = Product.findOneAndDelete;
  const originalCartUpdate = Cart.updateMany;
  const originalWishlistUpdate = Wishlist.updateMany;
  const originalDestroy = cloudinary.uploader.destroy;

  let storedProduct = {
    _id: "product-1",
    images: [
      "https://res.cloudinary.com/demo/image/upload/v12/shopeasy/products/owned.jpg",
      "https://marketplace.example/external.jpg",
    ],
  };
  const destroyed = [];
  Product.findOneAndDelete = async () => {
    const deleted = storedProduct;
    storedProduct = null;
    return deleted;
  };
  Cart.updateMany = async () => ({ modifiedCount: 1 });
  Wishlist.updateMany = async () => ({ modifiedCount: 1 });
  cloudinary.config({ cloud_name: "demo" });
  cloudinary.uploader.destroy = async (publicId) => {
    destroyed.push(publicId);
  };

  try {
    const first = response();
    await handlerFor(
      productRouter,
      "/:id",
      "delete",
    )({ params: { id: "product-1" } }, first);
    assert.equal(first.statusCode, 200);
    assert.match(first.body.message, /deleted successfully/i);
    assert.deepEqual(first.body.cleanupWarnings, []);
    assert.deepEqual(destroyed, ["shopeasy/products/owned"]);

    const afterRefresh = response();
    await handlerFor(
      productRouter,
      "/:id",
      "delete",
    )({ params: { id: "product-1" } }, afterRefresh);
    assert.equal(afterRefresh.statusCode, 404);
    assert.match(afterRefresh.body.message, /not found/i);
  } finally {
    Product.findOneAndDelete = originalProductDelete;
    Cart.updateMany = originalCartUpdate;
    Wishlist.updateMany = originalWishlistUpdate;
    cloudinary.uploader.destroy = originalDestroy;
  }
});


test("cart reads purge items whose product was deleted", async () => {
  const originalCartFind = Cart.findOne;
  let saves = 0;
  const present = { _id: "present-1" };
  const cart = {
    items: [{ product: present }, { product: null }],
    async save() {
      saves += 1;
    },
  };
  Cart.findOne = () => populatedQuery(cart);

  try {
    const res = response();
    await handlerFor(cartRouter, "/", "get")({ user: { _id: "user-1" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].product._id, "present-1");
    assert.equal(saves, 1);
  } finally {
    Cart.findOne = originalCartFind;
  }
});

test("cart add stores a manual product and returns the updated cart", async () => {
  const originalProductFind = Product.findById;
  const originalCartFind = Cart.findOne;
  const originalCartCreate = Cart.create;
  const addHandler = handlerFor(cartRouter, "/add", "post");
  let cartLookups = 0;

  try {
    let saves = 0;
    const manualCart = {
      items: [],
      async save() {
        saves += 1;
      },
    };
    Product.findById = async () => ({
      _id: "manual-1",
      stock: 20,
    });
    Cart.findOne = () => {
      cartLookups += 1;
      return populatedQuery(manualCart);
    };
    Cart.create = async () => manualCart;

    const manualResponse = response();
    await addHandler(
      {
        body: {
          productId: "manual-1",
          quantity: 2,
          size: "M",
          color: "Blue",
        },
        user: { _id: "user-1" },
      },
      manualResponse,
    );
    assert.equal(manualResponse.statusCode, 200);
    assert.equal(manualCart.items.length, 1);
    assert.equal(manualCart.items[0].quantity, 2);
    assert.equal(saves, 1);
  } finally {
    Product.findById = originalProductFind;
    Cart.findOne = originalCartFind;
    Cart.create = originalCartCreate;
  }
});
