// app/routes/home.tsx
import { useNavigate } from 'react-router';
import Navbar from '~/components/Navbar';
import { resumes } from '../../constants';

export default function Home() {
    const navigate = useNavigate();

    return (
        <main className="min-h-screen bg-[url('/images/bg-main.svg')] bg-cover bg-center">
            <Navbar />

            <section className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-20">
                {/* HERO */}
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto pt-8">
                    <div className="inline-flex items-center rounded-full bg-white/70 backdrop-blur px-4 py-2 shadow-sm mb-6">
                        <span className="text-sm font-medium text-gray-700">
                            Track applications, ATS scores & resume feedback
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold leading-tight text-gray-900">
                        Track Your Applications &{' '}
                        <span className="bg-blue-100 px-2 rounded-lg">
                            Resume Ratings
                        </span>
                    </h1>

                    <p className="mt-5 text-lg md:text-xl text-gray-600 max-w-3xl">
                        Upload your resume, paste a job description, and get an ATS score,
                        resume feedback, keyword gaps, and actionable suggestions to improve
                        your chances of getting shortlisted.
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => navigate('/upload')}
                            className="px-6 py-3 rounded-full bg-[#6C63FF] text-white font-medium hover:opacity-90 transition"
                        >
                            Upload Resume
                        </button>

                        <button
                            onClick={() => {
                                const el = document.getElementById('sample-resumes');
                                el?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-6 py-3 rounded-full bg-white text-gray-800 font-medium shadow hover:bg-gray-50 transition"
                        >
                            View Sample Ratings
                        </button>
                    </div>
                </div>

                {/* SAMPLE CARDS SECTION */}
                <section id="sample-resumes" className="mt-20">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
                            Review your submissions and check AI-powered feedback
                        </h2>
                        <p className="mt-3 text-gray-600 text-lg">
                            Example ATS resume ratings and score previews
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {resumes.map((resume) => (
                            <div
                                key={resume.id}
                                className="bg-white rounded-3xl shadow-md p-5 hover:shadow-lg transition"
                            >
                                {/* top row */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-3xl font-bold text-gray-900">
                                            {resume.companyName}
                                        </h3>
                                        <p className="text-gray-500 text-lg">
                                            {resume.jobTitle}
                                        </p>
                                    </div>

                                    <div className="w-16 h-16 rounded-full border-4 border-violet-300 flex items-center justify-center text-sm font-bold text-gray-800">
                                        {resume.feedback.overallScore}/100
                                    </div>
                                </div>

                                {/* resume preview */}
                                <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                                    <img
                                        src={resume.imageUrl}
                                        alt={`${resume.companyName} resume preview`}
                                        className="w-full h-[320px] object-cover object-top"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center mt-12">
                        <button
                            onClick={() => navigate('/upload')}
                            className="px-6 py-3 rounded-full bg-[#6C63FF] text-white font-medium hover:opacity-90 transition"
                        >
                            Analyze Your Resume
                        </button>
                    </div>
                </section>
            </section>
        </main>
    );
}