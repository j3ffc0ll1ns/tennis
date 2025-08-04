import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function MatchmakerDashboard() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  const events = useQuery(api.events.getEventsByMatchmaker);

  if (selectedEventId) {
    return (
      <div>
        <button
          onClick={() => setSelectedEventId(null)}
          className="mb-4 px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          ← Back to Events
        </button>
        <MatchmakingInterface eventId={selectedEventId as any} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Assigned Events</h2>

      {events === undefined ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No events assigned yet</p>
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
                  {event.status === "confirmed" && (
                    <p className="text-xs text-green-600 mt-1">Ready for matchmaking!</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchmakingInterface({ eventId }: { eventId: Id<"events"> }) {
  const eventDetails = useQuery(api.events.getEventDetails, { eventId });
  const matches = useQuery(api.matches.getMatchesByEvent, { eventId });
  
  const createMatches = useMutation(api.matches.createMatches);
  const recordScore = useMutation(api.matches.recordMatchScore);

  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [scoreForm, setScoreForm] = useState({
    sets: [{ player1Score: 0, player2Score: 0 }],
    winnerId: "",
  });

  if (!eventDetails || !matches) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { event, courts, invitations } = eventDetails;
  const acceptedPlayers = invitations
    .filter(inv => inv.status === "accepted")
    .map(inv => inv.player)
    .filter(Boolean);

  const handleCreateMatch = async (courtId: Id<"courts">, matchNumber: number, playerIds: Id<"userProfiles">[]) => {
    try {
      await createMatches({
        eventId,
        courtId,
        matchNumber,
        playerIds,
      });
      toast.success("Match created successfully!");
    } catch (error) {
      toast.error("Failed to create match: " + (error as Error).message);
    }
  };

  const handleRecordScore = async (matchId: Id<"matches">) => {
    if (!scoreForm.winnerId) {
      toast.error("Please select a winner");
      return;
    }

    try {
      await recordScore({
        matchId,
        scores: scoreForm.sets.map((set, index) => ({
          set: index + 1,
          player1Score: set.player1Score,
          player2Score: set.player2Score,
        })),
        winnerId: scoreForm.winnerId as any,
      });
      toast.success("Score recorded successfully!");
      setSelectedMatch(null);
      setScoreForm({ sets: [{ player1Score: 0, player2Score: 0 }], winnerId: "" });
    } catch (error) {
      toast.error("Failed to record score: " + (error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.name}</h2>
        <p className="text-gray-600">
          {acceptedPlayers.length} confirmed players • {matches.length} matches created
        </p>
      </div>

      {event.status === "confirmed" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Matches</h3>
          <div className="space-y-4">
            {courts.map((court) => (
              <div key={court._id} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">
                  Court {court.courtNumber}: {court.label} ({court.capacity === 2 ? "Singles" : "Doubles"})
                </h4>
                
                {Array.from({ length: event.matchesPerCourt }, (_, matchIndex) => {
                  const existingMatch = matches.find(
                    m => m.courtId === court._id && m.matchNumber === matchIndex + 1
                  );

                  if (existingMatch) {
                    return (
                      <div key={matchIndex} className="mb-2 p-3 bg-gray-50 rounded">
                        <p className="font-medium">Match {matchIndex + 1}</p>
                        <p className="text-sm text-gray-600">
                          {existingMatch.players?.map(p => `${p?.firstName} ${p?.lastName}`).join(" vs ")}
                        </p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          existingMatch.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                          existingMatch.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                          "bg-green-100 text-green-800"
                        }`}>
                          {existingMatch.status}
                        </span>
                        {existingMatch.status === "scheduled" && (
                          <button
                            onClick={() => setSelectedMatch(existingMatch._id)}
                            className="ml-2 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover"
                          >
                            Record Score
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={matchIndex} className="mb-2">
                      <MatchCreator
                        courtId={court._id}
                        matchNumber={matchIndex + 1}
                        capacity={court.capacity}
                        availablePlayers={acceptedPlayers}
                        onCreateMatch={handleCreateMatch}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Recording Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Record Match Score</h3>
            
            {(() => {
              const match = matches.find(m => m._id === selectedMatch);
              if (!match) return null;

              return (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">
                      {match.players?.map(p => `${p?.firstName} ${p?.lastName}`).join(" vs ")}
                    </p>
                  </div>

                  {scoreForm.sets.map((set, setIndex) => (
                    <div key={setIndex} className="border rounded p-3">
                      <h4 className="font-medium mb-2">Set {setIndex + 1}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {match.players?.[0]?.firstName} Score
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={set.player1Score}
                            onChange={(e) => {
                              const newSets = [...scoreForm.sets];
                              newSets[setIndex].player1Score = parseInt(e.target.value) || 0;
                              setScoreForm({ ...scoreForm, sets: newSets });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {match.players?.[1]?.firstName} Score
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={set.player2Score}
                            onChange={(e) => {
                              const newSets = [...scoreForm.sets];
                              newSets[setIndex].player2Score = parseInt(e.target.value) || 0;
                              setScoreForm({ ...scoreForm, sets: newSets });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Winner</label>
                    <select
                      value={scoreForm.winnerId}
                      onChange={(e) => setScoreForm({ ...scoreForm, winnerId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select winner</option>
                      {match.players?.map((player) => (
                        <option key={player?._id} value={player?._id}>
                          {player?.firstName} {player?.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => handleRecordScore(selectedMatch as any)}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
                    >
                      Record Score
                    </button>
                    <button
                      onClick={() => setSelectedMatch(null)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCreator({ 
  courtId, 
  matchNumber, 
  capacity, 
  availablePlayers, 
  onCreateMatch 
}: {
  courtId: Id<"courts">;
  matchNumber: number;
  capacity: number;
  availablePlayers: any[];
  onCreateMatch: (courtId: Id<"courts">, matchNumber: number, playerIds: Id<"userProfiles">[]) => void;
}) {
  const [selectedPlayers, setSelectedPlayers] = useState<Id<"userProfiles">[]>([]);

  const handleCreateMatch = () => {
    if (selectedPlayers.length !== capacity) {
      toast.error(`Please select exactly ${capacity} players`);
      return;
    }
    onCreateMatch(courtId, matchNumber, selectedPlayers);
    setSelectedPlayers([]);
  };

  return (
    <div className="p-3 border rounded bg-gray-50">
      <p className="font-medium mb-2">Match {matchNumber} - Select {capacity} players:</p>
      <div className="space-y-2 mb-3">
        {availablePlayers.map((player) => (
          <label key={player._id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedPlayers.includes(player._id)}
              onChange={(e) => {
                if (e.target.checked && selectedPlayers.length < capacity) {
                  setSelectedPlayers([...selectedPlayers, player._id]);
                } else if (!e.target.checked) {
                  setSelectedPlayers(selectedPlayers.filter(id => id !== player._id));
                }
              }}
              disabled={!selectedPlayers.includes(player._id) && selectedPlayers.length >= capacity}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">
              {player.firstName} {player.lastName} ({player.skillLevel || "No skill level"})
            </span>
          </label>
        ))}
      </div>
      <button
        onClick={handleCreateMatch}
        disabled={selectedPlayers.length !== capacity}
        className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover disabled:opacity-50"
      >
        Create Match ({selectedPlayers.length}/{capacity})
      </button>
    </div>
  );
}
