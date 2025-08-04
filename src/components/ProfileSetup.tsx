import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ProfileSetup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "organizer" | "matchmaker" | "player">("player");
  const [phone, setPhone] = useState("");
  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createProfile = useMutation(api.auth.createUserProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        phone: phone.trim() || undefined,
        skillLevel, // Now required for all users since everyone can play
      });
      toast.success("Profile created successfully!");
    } catch (error) {
      toast.error("Failed to create profile: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-primary mb-2">Complete Your Profile</h2>
        <p className="text-secondary">Tell us a bit about yourself to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="auth-input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="auth-input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role *
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="auth-input-field"
            required
          >
            <option value="player">Player</option>
            <option value="admin">Admin (first user only)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="auth-input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tennis Skill Level *
          </label>
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value as any)}
            className="auth-input-field"
            required
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            All users can participate as players regardless of their role
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="auth-button"
        >
          {isSubmitting ? "Creating Profile..." : "Create Profile"}
        </button>
      </form>
    </div>
  );
}
