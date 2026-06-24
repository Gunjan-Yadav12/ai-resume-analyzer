import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Navbar from '~/components/Navbar';
import Summary from '~/components/Summary';
import ATS from '~/components/ATS';
import Details from '~/components/Details';

type StoredAnalysis = {
    id: string;
    companyName: string;
    jobTitle: string;
    jobDescription?: string;
    feedback?: Partial<Feedback> | null;
    createdAt: number;
};

const EMPTY_CATEGORY: FeedbackCategory = {
    score: 0,
    tips: [],
};

function normalizeFeedback(raw?: Partial<Feedback> | null): Feedback {
    return {
        overallScore: raw?.overallScore ?? 0,
        ATS: {
            score: raw?.ATS?.score ?? 0,
            tips: raw?.ATS?.tips ?? [],
        },
        toneAndStyle: {
            score: raw?.toneAndStyle?.score ?? 0,
            tips: raw?.toneAndStyle?.tips ?? [],
        },
        content: {
            score: raw?.content?.score ?? 0,
            tips: raw?.content?.tips ?? [],
        },
        structure: {
            score: raw?.structure?.score ?? 0,
            tips: raw?.structure?.tips ?? [],
        },
        skills: {
            score: raw?.skills?.score ?? 0,
            tips: raw?.skills?.tips ?? [],
        },
    };
}

export default function Resume() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [resume, setResume] = useState<StoredAnalysis | null>(null);

    useEffect(() => {
        if (!id) {
            navigate('/');
            return;
        }

        const raw = sessionStorage.getItem(`analysis:${id}`);

        if (!raw) {
            navigate('/');
            return;
        }

        try {
            const parsed = JSON.parse(raw) as StoredAnalysis;
            setResume(parsed);
        } catch (error) {
            console.error('Failed to parse stored analysis:', error);
            navigate('/');
        }
    }, [id, navigate]);

    if (!resume) return null;

    const feedback = normalizeFeedback(resume.feedback);

    return (
        <main className="min-h-screen bg-[#f6f8ff] text-slate-900">
            <Navbar />

            <section className="px-6 pb-16 pt-10 md:px-10 lg:px-16">
                <div className="mx-auto max-w-6xl">
                    <button
                        onClick={() => navigate('/')}
                        className="mb-8 text-sm text-slate-600 hover:text-slate-900"
                    >
                        ← Back to home
                    </button>

                    <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-blue-600">
                            Resume Analysis
                        </p>
                        <h1 className="mt-2 text-3xl font-bold">
                            {resume.jobTitle || 'Resume'}
                        </h1>
                        <p className="mt-2 text-slate-500">
                            {resume.companyName || 'Analysis Result'}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <Summary feedback={feedback} />
                        <ATS score={feedback.ATS.score} tips={feedback.ATS.tips} />
                        <Details feedback={feedback} />
                    </div>
                </div>
            </section>
        </main>
    );
}