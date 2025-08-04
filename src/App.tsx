import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ProfileSetup } from "./components/ProfileSetup";
import { AdminDashboard } from "./components/AdminDashboard";
import { OrganizerDashboard } from "./components/OrganizerDashboard";
import { MatchmakerDashboard } from "./components/MatchmakerDashboard";
import { PlayerDashboard } from "./components/PlayerDashboard";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">🎾</span>
          </div>
          <h2 className="text-xl font-semibold text-primary">Tampa Bay Doubles</h2>
        </div>
        <Authenticated>
          <div className="flex items-center gap-3">
            <UserInfo />
            <SignOutButton />
          </div>
        </Authenticated>
      </header>
      <main className="flex-1 p-8">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.auth.getUserProfile);

  if (loggedInUser === undefined || userProfile === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">Tampa Bay Doubles</h1>
            <p className="text-xl text-secondary">Sign in to manage your tennis events</p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        {!userProfile ? (
          <ProfileSetup />
        ) : (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-primary mb-2">
                Welcome, {userProfile.firstName} {userProfile.lastName}
              </h1>
              <p className="text-lg text-secondary capitalize">
                {userProfile.role} Dashboard
              </p>
            </div>

            {userProfile.role === "admin" && <AdminDashboard />}
            {userProfile.role === "organizer" && <OrganizerDashboard />}
            {userProfile.role === "matchmaker" && <MatchmakerDashboard />}
            {userProfile.role === "player" && <PlayerDashboard />}
            
            {/* Show player dashboard for organizers and matchmakers too */}
            {(userProfile.role === "organizer" || userProfile.role === "matchmaker") && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">My Player Activities</h2>
                <PlayerDashboard />
              </div>
            )}
          </div>
        )}
      </Authenticated>
    </div>
  );
}

function UserInfo() {
  const userProfile = useQuery(api.auth.getUserProfile);
  
  if (!userProfile) {
    return null;
  }

  return (
    <div className="text-right">
      <div className="text-sm font-medium text-gray-900">
        {userProfile.firstName} {userProfile.lastName}
      </div>
      <div className="text-xs text-gray-500 capitalize">
        {userProfile.role}
      </div>
    </div>
  );
}
