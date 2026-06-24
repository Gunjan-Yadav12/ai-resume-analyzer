import ScoreGauge from '~/components/ScoreGuage';
import ScoreBadge from '~/components/ScoreBadge';

const Category = ({
    title,
    score,
}: {
    title: string;
    score: number;
}) => {
    const safeScore = Number.isFinite(score) ? score : 0;
    const textColor =
        safeScore > 70
            ? 'text-green-600'
            : safeScore > 49
            ? 'text-yellow-600'
            : 'text-red-600';

    return (
        <div className="resume-summary">
            <div className="category">
                <div className="flex flex-row items-center justify-center gap-2">
                    <p className="text-2xl">{title}</p>
                    <ScoreBadge score={safeScore} />
                </div>
                <p className="text-2xl">
                    <span className={textColor}>{safeScore}</span>/100
                </p>
            </div>
        </div>
    );
};

const Summary = ({ feedback }: { feedback: Feedback }) => {
    const overallScore = Number(feedback?.overallScore ?? 0);
    const toneScore = Number(feedback?.toneAndStyle?.score ?? 0);
    const contentScore = Number(feedback?.content?.score ?? 0);
    const structureScore = Number(feedback?.structure?.score ?? 0);
    const skillsScore = Number(feedback?.skills?.score ?? 0);

    return (
        <div className="w-full rounded-2xl bg-white shadow-md">
            <div className="flex flex-row items-center gap-8 p-4">
                <ScoreGauge score={overallScore} />
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold">Your Resume Score</h2>
                    <p className="text-sm text-gray-500">
                        This score is calculated based on the categories below.
                    </p>
                </div>
            </div>

            <Category title="Tone & Style" score={toneScore} />
            <Category title="Content" score={contentScore} />
            <Category title="Structure" score={structureScore} />
            <Category title="Skills" score={skillsScore} />
        </div>
    );
};

export default Summary;