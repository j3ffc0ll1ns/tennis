import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface PlayerManagementProps {
  players: any[] | undefined;
}

export function PlayerManagement({ players }: PlayerManagementProps) {
  const toggleUserStatus = useMutation(api.players.toggleUserActiveStatus);

  const handleToggleStatus = async (userId: string) => {
    try {
      const result = await toggleUserStatus({ targetUserId: userId as any });
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to update status: " + (error as Error).message);
    }
  };

  if (!players) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Player Management</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Manage player status. Inactive players won't appear in event invitation lists.
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {players.map((player) => (
            <div key={player._id} className="px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-900">
                  {player.firstName} {player.lastName}
                </h3>
                <div className="text-sm text-gray-500">
                  <span className="capitalize">{player.role}</span> • Skill: {player.skillLevel || "Not set"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  player.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {player.isActive ? "Active" : "Inactive"}
                </span>
                {player.role !== "admin" && (
                  <button
                    onClick={() => handleToggleStatus(player.userId)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      player.isActive 
                        ? "bg-red-100 text-red-700 hover:bg-red-200" 
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {player.isActive ? "Deactivate" : "Activate"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
