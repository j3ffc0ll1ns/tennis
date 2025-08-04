import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface PlayerReportsProps {
  events?: any[];
}

export function PlayerReports({ events }: PlayerReportsProps) {
  const [activeTab, setActiveTab] = useState<"overall" | "event">("overall");
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const overallReport = useQuery(api.reports.getPlayerParticipationReport);
  const eventReport = useQuery(
    api.reports.getEventParticipationReport,
    selectedEventId ? { eventId: selectedEventId as Id<"events"> } : "skip"
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overall")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "overall"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Overall Statistics
          </button>
          <button
            onClick={() => setActiveTab("event")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "event"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Event Report
          </button>
        </nav>
      </div>

      {activeTab === "overall" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Player Participation Report</h2>
          
          {overallReport === undefined ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : overallReport.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No completed matches found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Player Statistics ({overallReport.length} active players)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Matches
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Wins
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Losses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Win Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Events Played
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {overallReport.map((playerStat) => (
                      <tr key={playerStat.profile._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {playerStat.profile.firstName} {playerStat.profile.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {playerStat.profile.role} • {playerStat.profile.skillLevel || "No skill level"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {playerStat.totalMatches}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {playerStat.wins}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {playerStat.losses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {playerStat.winRate}%
                            </div>
                            <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${playerStat.winRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {playerStat.events.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "event" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Event Participation Report</h2>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select an event</option>
              {events?.map((event) => (
                <option key={event._id} value={event._id}>
                  {event.name} - {new Date(event.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {!selectedEventId ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Please select an event to view the report</p>
            </div>
          ) : eventReport === undefined ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Event Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {eventReport.event.name}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {eventReport.summary.totalInvited}
                    </div>
                    <div className="text-sm text-gray-500">Total Invited</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {eventReport.summary.totalAccepted}
                    </div>
                    <div className="text-sm text-gray-500">Accepted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {eventReport.summary.totalMatches}
                    </div>
                    <div className="text-sm text-gray-500">Total Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {eventReport.summary.completedMatches}
                    </div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </div>
                </div>
              </div>

              {/* Player Statistics */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Player Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Player
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Matches
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Wins
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Losses
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Win Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {eventReport.playerStats.map((playerStat) => (
                        <tr key={playerStat.profile._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {playerStat.profile.firstName} {playerStat.profile.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {playerStat.profile.skillLevel || "No skill level"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              playerStat.invitationStatus === "accepted" ? "bg-green-100 text-green-800" :
                              playerStat.invitationStatus === "declined" ? "bg-red-100 text-red-800" :
                              playerStat.invitationStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {playerStat.invitationStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {playerStat.totalMatches}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            {playerStat.wins}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                            {playerStat.losses}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {playerStat.totalMatches > 0 ? (
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900">
                                  {playerStat.winRate}%
                                </div>
                                <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full"
                                    style={{ width: `${playerStat.winRate}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
