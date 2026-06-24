// app/components/Navbar.tsx
import { useNavigate } from 'react-router';
import { useAuthStore } from '~/lib/store';

export default function Navbar() {
    const { user, signOut } = useAuthStore();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    return (
        <nav className="w-full flex items-center justify-between px-6 md:px-10 py-5">
            {/* Left */}
            <button
                onClick={() => navigate(user ? '/dashboard' : '/')}
                className="flex items-center gap-3"
            >
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <img src="/icons/pin.svg" alt="ResuMind" className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-gray-900">ResuMind</span>
            </button>

            {/* Right */}
            <div className="flex items-center gap-3">
                {user ? (
                    <>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-sm text-gray-700 hover:text-gray-900 transition"
                        >
                            Dashboard
                        </button>

                        <button
                            onClick={() => navigate('/upload')}
                            className="px-5 py-2.5 rounded-full bg-[#6C63FF] text-white text-sm font-medium hover:opacity-90 transition"
                        >
                            Upload Resume
                        </button>

                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName ?? 'User avatar'}
                                className="w-9 h-9 rounded-full object-cover border border-gray-200"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-semibold">
                                {user.displayName?.[0]?.toUpperCase() ?? 'U'}
                            </div>
                        )}

                        <button
                            onClick={handleSignOut}
                            className="text-sm text-gray-500 hover:text-gray-900 transition"
                        >
                            Sign out
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => navigate('/auth')}
                            className="text-sm text-gray-700 hover:text-gray-900 transition"
                        >
                            Sign in
                        </button>

                        <button
                            onClick={() => navigate('/upload')}
                            className="px-5 py-2.5 rounded-full bg-[#6C63FF] text-white text-sm font-medium hover:opacity-90 transition"
                        >
                            Upload Resume
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}