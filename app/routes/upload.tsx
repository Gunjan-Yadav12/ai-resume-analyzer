import {type FormEvent, useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file);
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
        try {
            // STEP 1: Upload the PDF file to Puter FS
            setStatusText('Uploading the file...');
            const uploadedFile = await fs.upload([file]);
            if (!uploadedFile) return setStatusText('Error: Failed to upload file');

            // STEP 2: Convert first page of PDF to a PNG image
            setStatusText('Converting to image...');
            const imageFile = await convertPdfToImage(file);
            if (!imageFile.file) return setStatusText(`Error: ${imageFile.error ?? 'Failed to convert PDF to image'}`);

            // STEP 3: Upload the image to Puter FS
            setStatusText('Uploading the image...');
            const uploadedImage = await fs.upload([imageFile.file]);
            if (!uploadedImage) return setStatusText('Error: Failed to upload image');

            // STEP 4: Save initial record to KV store before AI call
            // This means even if AI fails, the resume paths are already saved
            setStatusText('Preparing data...');
            const uuid = generateUUID();
            const data: {
                id: string;
                resumePath: string;
                imagePath: string;
                companyName: string;
                jobTitle: string;
                jobDescription: string;
                feedback: any; // 'any' because it starts as '' and becomes an object
            } = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                jobDescription,
                feedback: null,
            };
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            // STEP 5: Call AI for resume analysis
            setStatusText('Analyzing...');
            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription })
            );
            if (!feedback) return setStatusText('Error: Failed to analyze resume');

            // STEP 6: Extract text from the AI response
            // Puter returns content as either a plain string or an array of content blocks
            // We handle both shapes here so it never crashes regardless of what Puter returns
            const feedbackText =
                typeof feedback.message.content === 'string'
                    ? feedback.message.content
                    : feedback.message.content?.[0]?.text ?? '';

            if (!feedbackText) return setStatusText('Error: Empty response from AI');

            // STEP 7: Strip markdown code fences before parsing
            // Claude often wraps JSON in ```json ... ``` even when told not to
            // The three replaces handle: ```json, plain ```, and the closing ```
            const cleanText = feedbackText
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/```\s*$/i, '')
                .trim();

            // STEP 8: Parse JSON safely — never call JSON.parse without try/catch
            // on AI output because the model can always return unexpected formats
            let parsedFeedback;
            try {
                parsedFeedback = JSON.parse(cleanText);
            } catch (e) {
                console.error('JSON parse failed. Raw text was:', cleanText);
                return setStatusText(`Parse error: ${String(e)}`);
            }

            // STEP 9: Save final data with feedback and navigate
            data.feedback = parsedFeedback;
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setStatusText('Analysis complete, redirecting...');
            navigate(`/resume/${uuid}`);

        } catch (err) {
            // Catches ANY unhandled error in the entire flow above
            // Without this, errors kill the async function silently
            console.error('handleAnalyze error:', err);
            setStatusText(`Error: ${String(err)}`);
        } finally {
            // ALWAYS runs — even if a return statement fires inside try
            // This guarantees the UI never gets permanently stuck on the GIF
            setIsProcessing(false);
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // e.currentTarget IS the form element — no need for .closest('form')
        const formData = new FormData(e.currentTarget);

        // These keys must exactly match the name="" attributes in the JSX below
        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if (!file) return;

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}
                    {!isProcessing && (
                        <form
                            id="upload-form"
                            onSubmit={handleSubmit}
                            className="flex flex-col gap-4 mt-8"
                        >
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input
                                    type="text"
                                    name="company-name"
                                    placeholder="Company Name"
                                    id="company-name"
                                />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input
                                    type="text"
                                    name="job-title"
                                    placeholder="Job Title"
                                    id="job-title"
                                />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea
                                    rows={5}
                                    name="job-description"
                                    placeholder="Job Description"
                                    id="job-description"
                                />
                            </div>
                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>
                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Upload;
