import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '~/components/Navbar';
import FileUploader from '~/components/FileUploader';
import { generateUUID } from '~/lib/utils';
import { prepareInstructions } from '../../constants';
import { analyzeResume } from '~/lib/gemini';
import { extractTextFromPdf } from '~/lib/pdfExtract';

export default function Upload() {
    const navigate = useNavigate();

    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (selectedFile: File | null) => {
        setFile(selectedFile);
    };

 const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
}: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
}) => {
    setIsProcessing(true);
    setStatusText('');

    try {
        const resumeId = generateUUID();

        setStatusText('Reading PDF...');
        const resumeText = await extractTextFromPdf(file);

        if (!resumeText.trim()) {
            throw new Error('Could not extract text from this PDF.');
        }

        // hard cap input size — resume analyzers do not need infinite text
        const trimmedResumeText = resumeText.slice(0, 8000);
const safeJobDescription = jobDescription.trim().slice(0, 4000);

        setStatusText('Analyzing ATS match and feedback...');
        const rawFeedback = await analyzeResume(
            trimmedResumeText,
            prepareInstructions({
                jobTitle,
                jobDescription: safeJobDescription,
            })
        );

        let parsedFeedback: Feedback;
        try {
            parsedFeedback = JSON.parse(rawFeedback) as Feedback;
            console.log('parsedFeedback', parsedFeedback);
        } catch {
            console.error('Raw Gemini response:', rawFeedback);
            throw new Error('AI returned invalid JSON.');
        }

        const analysisResult = {
            id: resumeId,
            companyName,
            jobTitle,
            jobDescription: safeJobDescription,
            feedback: parsedFeedback,
            createdAt: Date.now(),
        };

        sessionStorage.setItem(
            `analysis:${resumeId}`,
            JSON.stringify(analysisResult)
        );

        setStatusText('Analysis complete, redirecting...');
        navigate(`/resume/${resumeId}`);
    } catch (err) {
        console.error('handleAnalyze error:', err);
        setStatusText(
            `Error: ${err instanceof Error ? err.message : String(err)}`
        );
    } finally {
        setIsProcessing(false);
    }
};


    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);

        const companyName = (formData.get('company-name') as string) || '';
        const jobTitle = (formData.get('job-title') as string) || '';
        const jobDescription = (formData.get('job-description') as string) || '';

        if (!file) {
            setStatusText('Error: Please select a PDF file first');
            return;
        }

        if (!companyName.trim()) {
            setStatusText('Error: Please enter a company name');
            return;
        }

        if (!jobTitle.trim()) {
            setStatusText('Error: Please enter a job title');
            return;
        }

        handleAnalyze({
            companyName: companyName.trim(),
            jobTitle: jobTitle.trim(),
            jobDescription: jobDescription.trim(),
            file,
        });
    };

    return (
        <main className="min-h-screen bg-[#f6f8ff] text-slate-900">
            <Navbar />

            <section className="px-6 pb-16 pt-10 md:px-10 lg:px-16">
                <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                    {/* LEFT SIDE */}
                    <div className="pt-4">
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700">
                            AI Resume Analysis
                        </span>

                        <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
                            Upload your resume and get ATS feedback that actually tells you what to fix
                        </h1>

                        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                            Paste the job description, upload your PDF resume, and get a structured ATS score,
                            content review, keyword feedback, and actionable improvements.
                        </p>

                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-sm font-semibold text-slate-900">ATS Match</p>
                                <p className="mt-2 text-sm text-slate-500">
                                    Check keyword relevance, formatting and structure.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-sm font-semibold text-slate-900">Actionable Feedback</p>
                                <p className="mt-2 text-sm text-slate-500">
                                    See exactly what to improve section by section.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-sm font-semibold text-slate-900">Job-Based Review</p>
                                <p className="mt-2 text-sm text-slate-500">
                                    Compare your resume against the role you’re applying for.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE CARD */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
                        {isProcessing ? (
                            <div className="flex min-h-[520px] flex-col items-center justify-center gap-5 text-center">
                                <img
                                    src="/images/resume-scan.gif"
                                    className="w-full max-w-sm"
                                    alt="Analyzing resume..."
                                />
                                <div>
                                    <h2 className="text-2xl font-semibold">Analyzing your resume</h2>
                                    <p className="mt-2 text-slate-500">{statusText}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold">Analyze Resume</h2>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Fill in the role details and upload your resume PDF.
                                    </p>
                                </div>

                                {statusText && statusText.startsWith('Error') && (
                                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {statusText}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label
                                            htmlFor="company-name"
                                            className="mb-2 block text-sm font-medium text-slate-700"
                                        >
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            name="company-name"
                                            id="company-name"
                                            placeholder="e.g. Google"
                                            required
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="job-title"
                                            className="mb-2 block text-sm font-medium text-slate-700"
                                        >
                                            Job Title
                                        </label>
                                        <input
                                            type="text"
                                            name="job-title"
                                            id="job-title"
                                            placeholder="e.g. Frontend Developer"
                                            required
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="job-description"
                                            className="mb-2 block text-sm font-medium text-slate-700"
                                        >
                                            Job Description
                                        </label>
                                        <textarea
                                            rows={6}
                                            name="job-description"
                                            id="job-description"
                                            placeholder="Paste the job description here..."
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="uploader"
                                            className="mb-2 block text-sm font-medium text-slate-700"
                                        >
                                            Upload Resume (PDF)
                                        </label>
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                            <FileUploader onFileSelect={handleFileSelect} />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                                    >
                                        Analyze Resume
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}