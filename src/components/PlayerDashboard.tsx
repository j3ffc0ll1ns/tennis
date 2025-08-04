import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function PlayerDashboard() {
  const [activeTab, setActiveTab] = useState<"invitations" | "matches">("invitations");
  
  const invitations = useQuery(api.players.getPlayerInvitations);
  const matches = useQuery(api.matches.getPlayerMatches);
  const respondToInvitation = useMutation(api.players.respondToInvitation);

  const handleResponse = async (invitationId: string, response: "accepted" | "declined") => {
    try {
      await respondToInvitation({ invitationId: invitationId as any, response });
      toast.success(`Invitation ${response} successfully!`);
    } catch (error) {
      toast.error("Failed to respond: " + (error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("invitations")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "invitations"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Event Invitations
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "matches"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            My Matches
          </button>
        </nav>
      </div>

      {activeTab === "invitations" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Event Invitations</h2>
          
          {invitations === undefined ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No invitations yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation._id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {invitation.event?.name}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>📅 {invitation.event ? new Date(invitation.event.date).toLocaleDateString() : "N/A"}</p>
                        <p>📍 {invitation.event?.location}</p>
                        <p>🕐 {invitation.event?.startTime}</p>
                        <p>⏰ Deadline: {invitation.event ? new Date(invitation.event.inviteDeadline).toLocaleString() : "N/A"}</p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        invitation.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        invitation.status === "accepted" ? "bg-green-100 text-green-800" :
                        invitation.status === "declined" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {invitation.status}
                      </span>
                    </div>
                  </div>
                  
                  {invitation.status === "pending" && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleResponse(invitation._id, "accepted")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleResponse(invitation._id, "declined")}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "matches" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">My Matches</h2>
          
          {matches === undefined ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No matches scheduled yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match._id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {match.event?.name}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>📅 {match.event ? new Date(match.event.date).toLocaleDateString() : "N/A"}</p>
                        <p>📍 {match.event?.location}</p>
                        <p>🎾 {match.court?.label} (Court {match.court?.courtNumber})</p>
                        <p>👥 Players: {match.players?.map(p => `${p?.firstName} ${p?.lastName}`).join(", ")}</p>
                        {match.winnerId && (
                          <p className="text-green-600 font-medium">
                            🏆 Winner: {match.players?.find(p => p?._id === match.winnerId)?.firstName} {match.players?.find(p => p?._id === match.winnerId)?.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        match.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                        match.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {match.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  
                  {match.scores && match.scores.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <h4 className="font-medium mb-2">Match Score:</h4>
                      <div className="space-y-1 text-sm">
                        {match.scores.map((score, index) => (
                          <p key={index}>
                            Set {score.set}: {score.player1Score} - {score.player2Score}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
