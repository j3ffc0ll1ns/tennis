import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { PlayerReports } from "./PlayerReports";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "reports">("overview");
  
  const events = useQuery(api.events.getEventsByOrganizer);
  const allUsers = useQuery(api.auth.getAllUsers);
  const migrateUsers = useMutation(api.auth.migrateUsersSkillLevel);

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "reports"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Reports
          </button>
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Events</h3>
              <p className="text-3xl font-bold text-primary">{events?.length || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-green-600">{allUsers?.length || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Players</h3>
              <p className="text-3xl font-bold text-blue-600">
                {allUsers?.filter(u => u.role === "player" && u.isActive).length || 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                As an admin, you have full access to all system features. You can create events,
                manage users, and oversee all tennis league activities.
              </p>
              <button
                onClick={async () => {
                  try {
                    const result = await migrateUsers({});
                    toast.success(result.message);
                  } catch (error) {
                    toast.error("Migration failed: " + (error as Error).message);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Migrate User Skill Levels
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && <UserManagement users={allUsers} />}
      
      {activeTab === "reports" && <PlayerReports events={events} />}
    </div>
  );
}

function UserManagement({ users }: { users: any[] | undefined }) {
  if (!users) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage user roles and permissions. Only admins can assign organizer and matchmaker roles.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((userProfile) => (
              <UserRow key={userProfile._id} userProfile={userProfile} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({ userProfile }: { userProfile: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newRole, setNewRole] = useState(userProfile.role);
  
  const assignRole = useMutation(api.auth.assignUserRole);
  const toggleUserStatus = useMutation(api.players.toggleUserActiveStatus);

  const handleRoleChange = async () => {
    if (newRole === userProfile.role) {
      setIsEditing(false);
      return;
    }

    try {
      await assignRole({
        targetUserId: userProfile.userId,
        newRole: newRole as any,
      });
      toast.success("Role updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update role: " + (error as Error).message);
      setNewRole(userProfile.role); // Reset on error
    }
  };

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {userProfile.firstName} {userProfile.lastName}
        </div>
        <div className="text-sm text-gray-500">
          Skill: {userProfile.skillLevel || "Not set"}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{userProfile.user?.email || "N/A"}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {isEditing ? (
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="player">Player</option>
            <option value="organizer">Organizer</option>
            <option value="matchmaker">Matchmaker</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
            userProfile.role === "admin" ? "bg-red-100 text-red-800" :
            userProfile.role === "organizer" ? "bg-blue-100 text-blue-800" :
            userProfile.role === "matchmaker" ? "bg-purple-100 text-purple-800" :
            "bg-green-100 text-green-800"
          }`}>
            {userProfile.role}
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          userProfile.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {userProfile.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        {isEditing ? (
          <div className="space-x-2">
            <button
              onClick={handleRoleChange}
              className="text-green-600 hover:text-green-900"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setNewRole(userProfile.role);
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-primary hover:text-primary-hover"
          >
            Edit Role
          </button>
        )}
      </td>
    </tr>
  );
}
