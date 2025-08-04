import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { CreateEventForm } from "./CreateEventForm";
import { EventDetails } from "./EventDetails";
import { PlayerManagement } from "./PlayerManagement";
import { PlayerReports } from "./PlayerReports";

export function OrganizerDashboard() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "players" | "reports">("events");
  
  const events = useQuery(api.events.getEventsByOrganizer);
  const allPlayers = useQuery(api.players.getAllPlayers);

  if (selectedEventId) {
    return (
      <div>
        <button
          onClick={() => setSelectedEventId(null)}
          className="mb-4 px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          ← Back to Dashboard
        </button>
        <EventDetails eventId={selectedEventId as any} />
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div>
        <button
          onClick={() => setShowCreateForm(false)}
          className="mb-4 px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          ← Back to Dashboard
        </button>
        <CreateEventForm onSuccess={() => setShowCreateForm(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("events")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "events" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            My Events
          </button>
          <button
            onClick={() => setActiveTab("players")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "players" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Player Management
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "reports" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Reports
          </button>
        </nav>
      </div>
      {activeTab === "events" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">My Events</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          Create New Event
        </button>
      </div>

      {events === undefined ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No events created yet</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Create Your First Event
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <div
              key={event._id}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedEventId(event._id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {event.name}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>📅 {new Date(event.date).toLocaleDateString()}</p>
                    <p>📍 {event.location}</p>
                    <p>🕐 {event.startTime}</p>
                    <p>🎾 {event.courtsReserved} courts, {event.matchesPerCourt} matches each</p>
                    {event.invitationStats && event.invitationStats.totalInvited > 0 && (
                      <div className="flex gap-4 text-xs mt-2">
                        <span className="text-green-600">✓ {event.invitationStats.accepted} accepted</span>
                        <span className="text-red-600">✗ {event.invitationStats.declined} declined</span>
                        <span className="text-yellow-600">⏳ {event.invitationStats.pending} pending</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    event.status === "setup" ? "bg-yellow-100 text-yellow-800" :
                    event.status === "inviting" ? "bg-blue-100 text-blue-800" :
                    event.status === "confirmed" ? "bg-green-100 text-green-800" :
                    event.status === "in_progress" ? "bg-purple-100 text-purple-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {event.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      )}
      
      {activeTab === "players" && <PlayerManagement players={allPlayers} />}
      
      {activeTab === "reports" && <PlayerReports events={events} />}
    </div>
  );
}
