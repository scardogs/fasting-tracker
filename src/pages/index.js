import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { IoPlayCircle, IoStopCircle, IoWater } from 'react-icons/io5';
import { IoMdClose, IoMdAdd, IoMdTrash } from 'react-icons/io';
import styles from '@/styles/Home.module.css';
import notificationService from '@/lib/notifications';

// Dynamic import for Charts to avoid SSR issues with Recharts
const Charts = dynamic(() => import('@/components/Charts'), { ssr: false });
const FastingStages = dynamic(() => import('@/components/FastingStages'), { ssr: false });
const Header = dynamic(() => import('@/components/Header'), { ssr: false });

export default function FastingTracker() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State Management
  const [isFasting, setIsFasting] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [goalHours, setGoalHours] = useState(16);
  const [fastingHistory, setFastingHistory] = useState([]);
  const [goalReached, setGoalReached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showCustomGoal, setShowCustomGoal] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState('');

  // Hydration State
  const [hydrationData, setHydrationData] = useState({ logs: [], total: 0, goal: 2000 });
  const [hydrationLoading, setHydrationLoading] = useState(false);

  // Mood/Energy State
  const [moodLogs, setMoodLogs] = useState([]);
  const [currentEnergy, setCurrentEnergy] = useState(3);
  const [currentMood, setCurrentMood] = useState('😀');

  const intervalRef = useRef(null);

  // Load data from database on mount
  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
      loadHydrationData();
      loadMoodData();
      // Register service worker and request notification permission
      notificationService.registerServiceWorker();
      notificationService.requestPermission();
    }
  }, [status]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Timer logic
  useEffect(() => {
    if (isFasting && startTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);

        // Check if goal is reached
        const elapsedHours = elapsed / 3600;
        if (elapsedHours >= goalHours && !goalReached) {
          setGoalReached(true);
          // Trigger notification
          notificationService.notifyGoalReached(goalHours);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isFasting, startTime, goalHours, goalReached]);

  // Don't render anything while checking authentication
  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active session
      const activeRes = await fetch('/api/sessions/active');
      const activeData = await activeRes.json();

      if (activeData.success && activeData.data) {
        const session = activeData.data;
        setIsFasting(true);
        setStartTime(new Date(session.startTime).getTime());
        setGoalHours(session.goalHours);

        // Check if it's a custom goal (not in preset values)
        const presetGoals = [12, 14, 16, 18, 20, 24];
        if (!presetGoals.includes(session.goalHours)) {
          setShowCustomGoal(true);
          setCustomGoalInput(session.goalHours.toString());
        }
      }

      // Fetch session history
      const historyRes = await fetch('/api/sessions');
      const historyData = await historyRes.json();

      if (historyData.success) {
        // Convert MongoDB sessions to frontend format
        const formattedHistory = historyData.data.map(session => ({
          id: session._id,
          startTime: new Date(session.startTime).getTime(),
          endTime: new Date(session.endTime).getTime(),
          duration: session.duration,
          goalHours: session.goalHours,
          goalReached: session.goalReached,
          notes: session.notes || '',
        }));
        setFastingHistory(formattedHistory);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data from database. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadHydrationData = async () => {
    try {
      setHydrationLoading(true);
      const res = await fetch('/api/hydration');
      const data = await res.json();
      if (data.success) {
        setHydrationData(data.data);
      }
    } catch (err) {
      console.error('Error loading hydration data:', err);
    } finally {
      setHydrationLoading(false);
    }
  };

  const loadMoodData = async () => {
    try {
      const res = await fetch('/api/mood');
      const data = await res.json();
      if (data.success) {
        setMoodLogs(data.data);
      }
    } catch (err) {
      console.error('Error loading mood data:', err);
    }
  };

  const handleAddMood = async () => {
    try {
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: currentMood, energy: currentEnergy }),
      });
      const data = await res.json();
      if (data.success) {
        loadMoodData();
      }
    } catch (err) {
      console.error('Error adding mood log:', err);
    }
  };

  const handleAddHydration = async (amount) => {
    try {
      const res = await fetch('/api/hydration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, goal: hydrationData.goal }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistic update or just reload
        loadHydrationData();
      }
    } catch (err) {
      console.error('Error adding hydration:', err);
    }
  };

  const handleDeleteHydration = async (id) => {
    try {
      const res = await fetch('/api/hydration', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        loadHydrationData();
      }
    } catch (err) {
      console.error('Error deleting hydration log:', err);
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
      hours: String(hrs).padStart(2, '0'),
      minutes: String(mins).padStart(2, '0'),
      seconds: String(secs).padStart(2, '0')
    };
  };

  // Format date/time for display
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format duration for history
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  // Start fasting
  const handleStartFasting = async () => {
    try {
      const now = Date.now();

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          sessionData: {
            startTime: now,
            goalHours: goalHours,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsFasting(true);
        setStartTime(now);
        setElapsedTime(0);
        setGoalReached(false);
      } else {
        setError(data.error || 'Failed to start session');
      }
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Failed to start session. Please try again.');
    }
  };

  // Stop fasting
  const handleStopFasting = async () => {
    try {
      const endTime = Date.now();
      const goalReachedValue = elapsedTime >= (goalHours * 3600);

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop',
          sessionData: {
            endTime: endTime,
            duration: elapsedTime,
            goalReached: goalReachedValue,
            notes: sessionNotes,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add to local history immediately for better UX
        const newSession = {
          id: data.data._id,
          startTime: startTime,
          endTime: endTime,
          duration: elapsedTime,
          goalHours: goalHours,
          goalReached: goalReachedValue,
          notes: sessionNotes,
        };

        setFastingHistory([newSession, ...fastingHistory]);
        setIsFasting(false);
        setStartTime(null);
        setElapsedTime(0);
        setGoalReached(false);
        setSessionNotes('');
      } else {
        setError(data.error || 'Failed to stop session');
      }
    } catch (err) {
      console.error('Error stopping session:', err);
      setError('Failed to stop session. Please try again.');
    }
  };

  // Update goal
  const handleGoalChange = async (newGoal) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateGoal',
          sessionData: {
            goalHours: newGoal,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGoalHours(newGoal);
        setGoalReached(false);
      } else {
        setError(data.error || 'Failed to update goal');
      }
    } catch (err) {
      console.error('Error updating goal:', err);
      setError('Failed to update goal. Please try again.');
    }
  };

  // Delete session with confirmation
  const handleDeleteSession = async (sessionId) => {
    setDeleteConfirm(sessionId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const response = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: deleteConfirm }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setFastingHistory(fastingHistory.filter(session => session.id !== deleteConfirm));
        setDeleteConfirm(null);
      } else {
        setError(data.error || 'Failed to delete session');
      }
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session. Please try again.');
    }
  };


  // Calculate analytics
  const calculateAnalytics = () => {
    if (fastingHistory.length === 0) {
      return {
        totalSessions: 0,
        averageDuration: 0,
        successRate: 0,
        longestFast: 0,
        totalHoursFasted: 0,
      };
    }

    const totalSessions = fastingHistory.length;
    const totalDuration = fastingHistory.reduce((sum, session) => sum + session.duration, 0);
    const averageDuration = totalDuration / totalSessions;
    const successfulSessions = fastingHistory.filter(session => session.goalReached).length;
    const successRate = (successfulSessions / totalSessions) * 100;
    const longestFast = Math.max(...fastingHistory.map(session => session.duration));
    const totalHoursFasted = totalDuration / 3600;

    return {
      totalSessions,
      averageDuration,
      successRate,
      longestFast,
      totalHoursFasted,
    };
  };

  // Calculate streaks
  const calculateStreaks = () => {
    if (fastingHistory.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Sort sessions by date (most recent first)
    const sortedSessions = [...fastingHistory].sort((a, b) => b.startTime - a.startTime);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = null;

    for (const session of sortedSessions) {
      if (!session.goalReached) continue;

      const sessionDate = new Date(session.startTime).toDateString();

      if (!lastDate) {
        tempStreak = 1;
        currentStreak = 1;
      } else {
        const daysDiff = Math.floor((new Date(lastDate) - new Date(sessionDate)) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          tempStreak++;
          if (currentStreak > 0) currentStreak++;
        } else if (daysDiff > 1) {
          currentStreak = 0;
          tempStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      lastDate = sessionDate;
    }

    return { currentStreak, longestStreak };
  };

  const analytics = calculateAnalytics();
  const streaks = calculateStreaks();

  // Calculate progress percentage
  const progressPercentage = Math.min((elapsedTime / (goalHours * 3600)) * 100, 100);
  const time = formatTime(elapsedTime);

  // Calculate circle progress
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  if (loading) {
    return (
      <>
        <Head>
          <title>Fasting Tracker - Track Your Fasting Window</title>
          <meta name="description" content="Track your intermittent fasting journey with ease" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading your fasting data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Fasting Tracker - Track Your Fasting Window</title>
        <meta name="description" content="Track your intermittent fasting journey with ease" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <div className={styles.container}>
        {/* Error Message */}
        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Main Timer Section */}
        <section className={styles.timerSection}>
          <div className={styles.circularTimer}>
            <svg className={styles.timerSvg} viewBox="0 0 280 280">
              {/* Background Circle */}
              <circle
                cx="140"
                cy="140"
                r="120"
                margin-top="200px"
                fill="none"
                stroke="var(--border)"
                strokeWidth="20"
              />
              {/* Progress Circle */}
              <circle


                cx="140"
                cy="140"
                r="120"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 140 140)"
                className={styles.progressCircle}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c9885" />
                  <stop offset="100%" stopColor="#a8bfad" />
                </linearGradient>
              </defs>
            </svg>

            <div className={styles.timerContent}>
              <div className={styles.timeDisplay}>
                <span className={styles.timeNumber}>{time.hours}</span>
                <span className={styles.timeSeparator}>:</span>
                <span className={styles.timeNumber}>{time.minutes}</span>
                <span className={styles.timeSeparator}>:</span>
                <span className={styles.timeNumber}>{time.seconds}</span>
              </div>
              <div className={styles.statusLabel}>
                {isFasting ? '🟢 Fasting' : '🔴 Not Fasting'}
              </div>
            </div>
          </div>

          <FastingStages elapsedTimeSeconds={elapsedTime} />

          {/* Goal Reached Notification */}
          {goalReached && (
            <div className={styles.goalNotification}>
              🎉 Goal Reached! You've completed your {goalHours}h fast!
            </div>
          )}

          {/* Start/Stop Button */}
          <button
            className={`${styles.actionButton} ${isFasting ? styles.stopButton : styles.startButton}`}
            onClick={isFasting ? handleStopFasting : handleStartFasting}
          >
            {isFasting ? (
              <>
                <IoStopCircle size={20} /> Stop Fasting
              </>
            ) : (
              <>
                <IoPlayCircle size={20} /> Start Fasting
              </>
            )}
          </button>
        </section>

        {/* Fasting Session Summary */}
        {isFasting && (
          <section className={styles.summarySection}>
            <div className={styles.summaryCard}>
              <h2 className={styles.sectionTitle}>Current Session</h2>

              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Start Time</span>
                  <span className={styles.summaryValue}>{formatDateTime(startTime)}</span>
                </div>

                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Duration</span>
                  <span className={styles.summaryValue}>{formatDuration(elapsedTime)}</span>
                </div>

                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Goal</span>
                  <div className={styles.goalContainer}>
                    <select
                      className={styles.goalSelect}
                      value={showCustomGoal ? 'custom' : goalHours}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'custom') {
                          setShowCustomGoal(true);
                          setCustomGoalInput(goalHours.toString());
                        } else {
                          setShowCustomGoal(false);
                          handleGoalChange(parseInt(value));
                        }
                      }}
                    >
                      <option value={12}>12 hours</option>
                      <option value={14}>14 hours</option>
                      <option value={16}>16 hours</option>
                      <option value={18}>18 hours</option>
                      <option value={20}>20 hours</option>
                      <option value={24}>24 hours</option>
                      <option value="custom">Custom...</option>
                    </select>
                    {showCustomGoal && (
                      <div className={styles.customGoalInput}>
                        <input
                          type="number"
                          min="1"
                          value={customGoalInput}
                          onChange={(e) => setCustomGoalInput(e.target.value)}
                          onBlur={() => {
                            const hours = parseInt(customGoalInput);
                            if (hours >= 1) {
                              handleGoalChange(hours);
                            } else {
                              setCustomGoalInput(goalHours.toString());
                            }
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const hours = parseInt(customGoalInput);
                              if (hours >= 1) {
                                handleGoalChange(hours);
                                e.target.blur();
                              }
                            }
                          }}
                          placeholder="Enter hours"
                          className={styles.customInput}
                        />
                        <span className={styles.customInputLabel}>hours</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBarLabel}>
                  <span>Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Analytics Section */}
        {fastingHistory.length > 0 && (
          <section className={styles.analyticsSection}>
            <h2 className={styles.sectionTitle}>Analytics</h2>

            <div className={styles.analyticsGrid}>
              <div className={styles.analyticsCard}>
                <div className={styles.analyticsValue}>{analytics.totalSessions}</div>
                <div className={styles.analyticsLabel}>Total Sessions</div>
              </div>

              <div className={styles.analyticsCard}>
                <div className={styles.analyticsValue}>{formatDuration(analytics.averageDuration)}</div>
                <div className={styles.analyticsLabel}>Average Duration</div>
              </div>

              <div className={styles.analyticsCard}>
                <div className={styles.analyticsValue}>{Math.round(analytics.successRate)}%</div>
                <div className={styles.analyticsLabel}>Success Rate</div>
              </div>

              <div className={styles.analyticsCard}>
                <div className={styles.analyticsValue}>{formatDuration(analytics.longestFast)}</div>
                <div className={styles.analyticsLabel}>Longest Fast</div>
              </div>

              <div className={styles.analyticsCard}>
                <div className={styles.analyticsValue}>{Math.round(analytics.totalHoursFasted)}h</div>
                <div className={styles.analyticsLabel}>Total Hours Fasted</div>
              </div>
            </div>
          </section>
        )}

        {/* Hydration Tracker Section */}
        <section className={styles.hydrationSection}>
          <div className={`${styles.summaryCard} ${styles.hydrationCard}`}>
            <div className={styles.hydrationHeader}>
              <h2 className={styles.sectionTitle}>
                <IoWater className={styles.waterIcon} /> Hydration Companion
              </h2>
              <div className={styles.hydrationTotal}>
                <span className={styles.totalAmount}>{hydrationData.total}</span>
                <span className={styles.goalSlash}>/</span>
                <span className={styles.goalAmount}>{hydrationData.goal}ml</span>
              </div>
            </div>

            <div className={styles.hydrationProgressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressBarFill} ${styles.waterFill}`}
                  style={{ width: `${Math.min((hydrationData.total / hydrationData.goal) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className={styles.quickAddGrid}>
              {[250, 500, 750].map((amount) => (
                <button
                  key={amount}
                  className={styles.quickAddButton}
                  onClick={() => handleAddHydration(amount)}
                >
                  <IoMdAdd /> {amount}ml
                </button>
              ))}
            </div>

            {hydrationData.logs.length > 0 && (
              <div className={styles.hydrationLogs}>
                <h3 className={styles.subTitleSmall}>Today's Logs</h3>
                <div className={styles.logsListSmall}>
                  {hydrationData.logs.map((log) => (
                    <div key={log._id} className={styles.logItemSmall}>
                      <span>{log.amount}ml at {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button
                        className={styles.deleteLogSmall}
                        onClick={() => handleDeleteHydration(log._id)}
                      >
                        <IoMdTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Mood & Energy Section */}
        <section className={styles.moodSection}>
          <div className={styles.moodCard}>
            <h2 className={styles.sectionTitle}>Current Feeling</h2>
            <div className={styles.moodControls}>
              <div className={styles.moodSelector}>
                {['😀', '😐', '😔', '😫', '🔋'].map((m) => (
                  <button
                    key={m}
                    className={`${styles.moodBtn} ${currentMood === m ? styles.moodBtnActive : ''}`}
                    onClick={() => setCurrentMood(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className={styles.energySelector}>
                <span className={styles.energyLabel}>Energy: {currentEnergy}/5</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={currentEnergy}
                  onChange={(e) => setCurrentEnergy(parseInt(e.target.value))}
                  className={styles.energyRange}
                />
              </div>
              <button className={styles.logMoodButton} onClick={handleAddMood}>
                Log Feeling
              </button>
            </div>

            {moodLogs.length > 0 && (
              <div className={styles.moodHistory}>
                <h3 className={styles.subTitleSmall}>Recent Logs</h3>
                <div className={styles.moodGridScroll}>
                  {moodLogs.slice(0, 5).map((log) => (
                    <div key={log._id} className={styles.moodLogItem}>
                      <span className={styles.logMoodIcon}>{log.mood}</span>
                      <div className={styles.logMoodInfo}>
                        <span className={styles.logEnergy}>Energy: {log.energy}</span>
                        <span className={styles.logTime}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Visual Charts Section */}
        {fastingHistory.length > 0 && (
          <section className={styles.chartsSection}>
            <h2 className={styles.sectionTitle}>Visual Analytics</h2>
            <Charts fastingHistory={fastingHistory} />
          </section>
        )}

        {/* Daily Logs Section */}
        {fastingHistory.length > 0 && (
          <section className={styles.logsSection}>
            <h2 className={styles.sectionTitle}>Fasting History</h2>

            <div className={styles.logsList}>
              {fastingHistory.slice(0, 10).map((session) => (
                <div key={session.id} className={styles.logCard}>
                  <div className={styles.logHeader}>
                    <span className={styles.logDate}>
                      {new Date(session.startTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <div className={styles.logHeaderRight}>
                      {session.goalReached && (
                        <span className={styles.goalBadge}>✓ Goal Reached</span>
                      )}
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteSession(session.id)}
                        title="Delete session"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className={styles.logDetails}>
                    <div className={styles.logDetailItem}>
                      <span className={styles.logLabel}>Started</span>
                      <span className={styles.logValue}>{formatDateTime(session.startTime)}</span>
                    </div>

                    <div className={styles.logDetailItem}>
                      <span className={styles.logLabel}>Ended</span>
                      <span className={styles.logValue}>{formatDateTime(session.endTime)}</span>
                    </div>

                    <div className={styles.logDetailItem}>
                      <span className={styles.logLabel}>Duration</span>
                      <span className={styles.logDuration}>{formatDuration(session.duration)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
