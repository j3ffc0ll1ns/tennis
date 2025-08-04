import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface EventDetailsProps {
  eventId: Id<"events">;
}

export function EventDetails({ eventId }: EventDetailsProps) {
  const [showAddCourt, setShowAddCourt] = useState(false);
  const [showInvitePlayers, setShowInvitePlayers] = useState(false);
  
  const eventDetails = useQuery(api.events.getEventDetails, { eventId });
  const players = useQuery(api.players.getAllPlayers);
  
  const addCourt = useMutation(api.events.addCourt);
  const invitePlayer = useMutation(api.events.invitePlayer);
  const startInviting = useMutation(api.events.startInviting);

  if (!eventDetails) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { event, courts, invitations } = eventDetails;
  const acceptedCount = invitations.filter(inv => inv.status === "accepted").length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.name}</h2>
            <div className="space-y-1 text-gray-600">
              <p>📅 {new Date(event.date).toLocaleDateString()}</p>
              <p>📍 {event.location}</p>
              <p>🕐 {event.startTime}</p>
              <p>🎾 {event.courtsReserved} courts, {event.matchesPerCourt} matches each</p>
              <p>👥 Total capacity: {event.totalCapacity} players</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
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

      {/* Courts Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Courts ({courts.length}/{event.courtsReserved})</h3>
          {event.status === "setup" && (
            <button
              onClick={() => setShowAddCourt(!showAddCourt)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Add Court
            </button>
          )}
        </div>

        {showAddCourt && <AddCourtForm eventId={eventId} onSuccess={() => setShowAddCourt(false)} />}

        <div className="grid gap-4">
          {courts.map((court) => (
            <div key={court._id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Court {court.courtNumber}: {court.label}</h4>
                  <p className="text-sm text-gray-600">
                    {court.surfaceType} surface • {court.capacity === 2 ? "Singles" : "Doubles"} ({court.capacity} players)
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {event.status === "setup" && courts.length === event.courtsReserved && (
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={async () => {
                try {
                  await startInviting({ eventId });
                  toast.success("Event is now ready for player invitations!");
                } catch (error) {
                  toast.error("Failed to start inviting: " + (error as Error).message);
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Start Inviting Players
            </button>
          </div>
        )}
      </div>

      {/* Invitations Section */}
      {event.status !== "setup" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Player Invitations ({acceptedCount}/{event.totalCapacity})
            </h3>
            {event.status === "inviting" && (
              <button
                onClick={() => setShowInvitePlayers(!showInvitePlayers)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Invite Players
              </button>
            )}
          </div>

          {showInvitePlayers && (
            <InvitePlayersForm 
              eventId={eventId} 
              invitedPlayerIds={invitations.map(inv => inv.playerId)}
              onSuccess={() => setShowInvitePlayers(false)} 
            />
          )}

          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div key={invitation._id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <span className="font-medium">
                    {invitation.player?.firstName} {invitation.player?.lastName}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">
                    ({invitation.player?.skillLevel || "No skill level"})
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  invitation.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  invitation.status === "accepted" ? "bg-green-100 text-green-800" :
                  invitation.status === "declined" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {invitation.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddCourtForm({ eventId, onSuccess }: { eventId: Id<"events">, onSuccess: () => void }) {
  const [courtNumber, setCourtNumber] = useState(1);
  const [label, setLabel] = useState("");
  const [surfaceType, setSurfaceType] = useState<"grass" | "clay" | "hard">("hard");
  const [capacity, setCapacity] = useState<2 | 4>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addCourt = useMutation(api.events.addCourt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error("Please enter a court label");
      return;
    }

    setIsSubmitting(true);
    try {
      await addCourt({
        eventId,
        courtNumber,
        label: label.trim(),
        surfaceType,
        capacity,
      });
      toast.success("Court added successfully!");
      onSuccess();
    } catch (error) {
      toast.error("Failed to add court: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
      <h4 className="font-medium mb-4">Add New Court</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Court #</label>
          <input
            type="number"
            min="1"
            value={courtNumber}
            onChange={(e) => setCourtNumber(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Center Court"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Surface</label>
          <select
            value={surfaceType}
            onChange={(e) => setSurfaceType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="hard">Hard</option>
            <option value="clay">Clay</option>
            <option value="grass">Grass</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={2}>Singles (2)</option>
            <option value={4}>Doubles (4)</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Court"}
        </button>
        <button
          type="button"
          onClick={onSuccess}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function InvitePlayersForm({ 
  eventId, 
  invitedPlayerIds, 
  onSuccess 
}: { 
  eventId: Id<"events">, 
  invitedPlayerIds: Id<"userProfiles">[], 
  onSuccess: () => void 
}) {
  const [selectedPlayers, setSelectedPlayers] = useState<Id<"userProfiles">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const players = useQuery(api.players.getAllPlayers);
  const invitePlayer = useMutation(api.events.invitePlayer);

  const availablePlayers = players?.filter(player => !invitedPlayerIds.includes(player._id)) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedPlayers.map(playerId => 
          invitePlayer({ eventId, playerId })
        )
      );
      toast.success(`Invited ${selectedPlayers.length} player(s) successfully!`);
      onSuccess();
    } catch (error) {
      toast.error("Failed to invite players: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
      <h4 className="font-medium mb-4">Invite Players</h4>
      <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
        {availablePlayers.map((player) => (
          <label key={player._id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded">
            <input
              type="checkbox"
              checked={selectedPlayers.includes(player._id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedPlayers([...selectedPlayers, player._id]);
                } else {
                  setSelectedPlayers(selectedPlayers.filter(id => id !== player._id));
                }
              }}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="flex-1">
              {player.firstName} {player.lastName}
              <span className="text-sm text-gray-600 ml-2">({player.skillLevel || "No skill level"})</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || selectedPlayers.length === 0}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Inviting..." : `Invite ${selectedPlayers.length} Player(s)`}
        </button>
        <button
          type="button"
          onClick={onSuccess}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
