import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => (
  <section className="flex min-h-[65vh] items-center justify-center bg-gray-50 px-5 py-16 text-center">
    <div>
      <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-pink-600">
        Error 404
      </p>
      <h1 className="mb-3 text-4xl font-extrabold text-gray-900 md:text-5xl">
        Page not found
      </h1>
      <p className="mx-auto mb-7 max-w-md text-gray-600">
        The page you requested does not exist or may have moved.
      </p>
      <Link
        to="/"
        className="inline-flex rounded-lg bg-pink-600 px-5 py-3 font-bold text-white no-underline transition hover:bg-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
      >
        Return home
      </Link>
    </div>
  </section>
);

export default NotFound;
