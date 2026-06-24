// app/routes/dashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '~/components/Navbar';
import ResumeCard from '~/components/ResumeCard';
import { useAuthStore } from '~/lib/store';
import { getUserResumes, type ResumeDocument } from '~/lib/firestore';

export default function Dashboard() {
    const { user, isLoading: authLoading } = useAuthStore();
    const navigate = useNavigate();

    const [resumes, setResumes] = useState<ResumeDocument[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/auth');
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        if (!user) return;

        const fetchResumes = async () => {
            setDataLoading(true);
            setError(null);

            try {
                const data = await getUserResumes(user.uid);
                setResumes(data);
            } catch (err) {
                console.error('Failed to fetch resumes:', err);
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load resumes'
                );
            } finally {
                setDataLoading(false);
            }
        };

        fetchResumes();
    }, [user]);

    if (authLoading) return null;
    if (!user) return null;

    return (
        <main className="min-h-screen bg-[url('/images/bg-main.svg')] bg-cover bg-center">
            <Navbar />

            <section className="max-w-7xl mx-auto px-6 md:px-10 py-10">
                <div className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                        Welcome back, {user.displayName?.split(' ')[0] || 'there'}
                    </h1>
                    <p className="mt-3 text-lg text-gray-600">
                        Review your analyzed resumes, ATS scores, and improvement suggestions.
                    </p>
                </div>

                {dataLoading && (
                    <div className="flex justify-center py-16">
                        <p className="text-gray-500">Loading your resumes...</p>
                    </div>
                )}

                {error && (
                    <div className="flex justify-center py-8">
                        <p className="text-red-500">{error}</p>
                    </div>
                )}

                {!dataLoading && !error && resumes.length === 0 && (
                    <div className="bg-white rounded-3xl shadow-md p-10 text-center">
                        <h2 className="text-2xl font-semibold text-gray-900">
                            No resume analyses yet
                        </h2>
                        <p className="text-gray-600 mt-3">
                            Upload your first resume and get ATS-based feedback.
                        </p>
                        <button
                            onClick={() => navigate('/upload')}
                            className="mt-6 px-6 py-3 rounded-full bg-[#6C63FF] text-white font-medium hover:opacity-90 transition"
                        >
                            Analyze Resume
                        </button>
                    </div>
                )}

                {!dataLoading && !error && resumes.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {resumes.map((resume) => (
                                <ResumeCard key={resume.id} resume={resume} />
                            ))}
                        </div>

                        <div className="flex justify-center mt-12">
                            <button
                                onClick={() => navigate('/upload')}
                                className="px-6 py-3 rounded-full bg-[#6C63FF] text-white font-medium hover:opacity-90 transition"
                            >
                                Analyze Another Resume
                            </button>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}