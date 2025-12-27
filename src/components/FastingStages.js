import styles from '@/styles/Home.module.css';

const STAGES = [
    {
        id: 'rising',
        label: 'Blood Sugar Rising',
        hours: 0,
        description: 'Your body is processing your last meal. Insulin levels are rising.',
        color: '#7c9885'
    },
    {
        id: 'falling',
        label: 'Blood Sugar Falling',
        hours: 4,
        description: 'Insulin levels start to drop. Your body begins to look for other energy sources.',
        color: '#a8bfad'
    },
    {
        id: 'ketosis',
        label: 'Ketosis Starts',
        hours: 12,
        description: 'Your body starts burning fat for energy. Ketone levels begin to rise.',
        color: '#60a5fa'
    },
    {
        id: 'fat-burning',
        label: 'Accelerated Fat Burning',
        hours: 18,
        description: 'Fat burning is in full swing. Growth hormone levels are increasing.',
        color: '#3b82f6'
    },
    {
        id: 'autophagy',
        label: 'Autophagy',
        hours: 24,
        description: 'Cells start cleaning out damaged components. Peak anti-aging happens here.',
        color: '#1d4ed8'
    },
    {
        id: 'growth-hormone',
        label: 'Growth Hormone Peak',
        hours: 48,
        description: 'Metabolism is optimized, and growth hormone is at its highest level.',
        color: '#1e3a8a'
    }
];

export default function FastingStages({ elapsedTimeSeconds }) {
    const elapsedHours = elapsedTimeSeconds / 3600;

    const currentStageIndex = STAGES.slice().reverse().findIndex(stage => elapsedHours >= stage.hours);
    const currentStage = currentStageIndex === -1 ? STAGES[0] : STAGES[STAGES.length - 1 - currentStageIndex];

    const nextStage = STAGES[STAGES.indexOf(currentStage) + 1];

    let progressInStage = 0;
    if (nextStage) {
        const stageDuration = nextStage.hours - currentStage.hours;
        const timeInStage = elapsedHours - currentStage.hours;
        progressInStage = Math.min((timeInStage / stageDuration) * 100, 100);
    } else {
        progressInStage = 100;
    }

    return (
        <div className={styles.stagesCard}>
            <div className={styles.stageHeader}>
                <h3 className={styles.stageTitle}>{currentStage.label}</h3>
                <span className={styles.stageTime}>{Math.floor(elapsedHours)}h fasted</span>
            </div>

            <p className={styles.stageDescription}>{currentStage.description}</p>

            <div className={styles.stageProgressWrapper}>
                <div className={styles.stageProgressBar}>
                    <div
                        className={styles.stageProgressFill}
                        style={{
                            width: `${progressInStage}%`,
                            backgroundColor: currentStage.color
                        }}
                    />
                </div>
                {nextStage && (
                    <div className={styles.nextStageLabel}>
                        Next: {nextStage.label} at {nextStage.hours}h
                    </div>
                )}
            </div>

            <div className={styles.allStages}>
                {STAGES.map((stage, index) => (
                    <div
                        key={stage.id}
                        className={`${styles.stageDot} ${elapsedHours >= stage.hours ? styles.stageDotActive : ''}`}
                        title={stage.label}
                        style={{ backgroundColor: elapsedHours >= stage.hours ? stage.color : 'var(--border)' }}
                    />
                ))}
            </div>
        </div>
    );
}
