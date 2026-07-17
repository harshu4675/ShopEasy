import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Loader from "../../components/Loader";

const AllUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data);
    } catch (error) {
      showToast("Error fetching users", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-5 md:px-4">
        <div className="flex justify-between items-center mb-[30px] flex-wrap gap-5 md:flex-col md:items-start md:gap-4">
          <h1 className="text-[28px] font-bold text-dark md:text-[22px]">
            All Users ({users.length})
          </h1>
        </div>

        <div className="bg-white p-5 rounded-md mb-6 shadow-sm md:p-3">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-[400px] py-3.5 px-5 border-2 border-gray-200 rounded-md text-[15px] transition-all duration-300 ease-custom focus:outline-none focus-ring-primary md:max-w-full md:text-base"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-20 px-5">
            <h3 className="text-[22px] mb-3 text-gray-700">No users found</h3>
          </div>
        ) : (
          <div className="bg-white rounded-md shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["User", "Email", "Phone", "Role", "Joined"].map((h) => (
                    <th
                      key={h}
                      className="py-4 px-5 text-left border-b border-gray-200 bg-gray-100 text-xs font-bold text-gray-600 uppercase tracking-[0.5px] md:py-3 md:px-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-100">
                    <td className="py-4 px-5 border-b border-gray-200 md:py-3 md:px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold text-base">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200 text-sm md:py-3 md:px-3">
                      {user.email}
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200 text-sm md:py-3 md:px-3">
                      {user.phone || "N/A"}
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200 md:py-3 md:px-3">
                      <span
                        className={`py-[5px] px-3 rounded-[50px] text-xs font-bold uppercase ${
                          user.role === "admin"
                            ? "bg-[#fce4ec] text-[#c2185b]"
                            : "bg-[#e3f2fd] text-[#1565c0]"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-5 border-b border-gray-200 text-sm md:py-3 md:px-3">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllUsers;
