import { SignOutButton } from "@clerk/nextjs";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-slate-400 max-w-sm">
          This dashboard is private. Your account doesn&apos;t have permission to access it.
        </p>
        <SignOutButton>
          <button className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
