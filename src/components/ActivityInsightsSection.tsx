import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ActivityInsight } from '../types/activityInsights';
import {
  clearActivityInsightsData,
  getCachedActivityInsights,
  refreshActivityInsights,
} from '../lib/activityInsights/activityInsightEngine';

type ActivityInsightsSectionProps = {
  safetyLevel?: 'normal' | 'caution' | 'urgent';
  consentCompleted?: boolean;
  onToast?: (message: string) => void;
};

export function ActivityInsightsSection({
  safetyLevel = 'normal',
  consentCompleted = true,
  onToast,
}: ActivityInsightsSectionProps) {
  const [insights, setInsights] = useState<ActivityInsight[]>(() => getCachedActivityInsights());
  const [loading, setLoading] = useState(false);
  const [aiRefreshing, setAiRefreshing] = useState(false);

  const loadInsights = useCallback(async (forceAi = false) => {
    setLoading(true);
    if (forceAi) setAiRefreshing(true);
    try {
      const next = await refreshActivityInsights({
        forceAi,
        safetyLevel,
        consentCompleted,
      });
      setInsights(next);
    } finally {
      setLoading(false);
      setAiRefreshing(false);
    }
  }, [consentCompleted, safetyLevel]);

  useEffect(() => {
    let cancelled = false;
    void refreshActivityInsights({
      forceAi: false,
      safetyLevel,
      consentCompleted,
    }).then((next) => {
      if (!cancelled) setInsights(next);
    });
    return () => {
      cancelled = true;
    };
  }, [consentCompleted, safetyLevel]);

  const handleRefresh = () => {
    void loadInsights(true);
    onToast?.('Refreshing Activity Insights…');
  };

  const handleClear = () => {
    clearActivityInsightsData();
    const next = getCachedActivityInsights();
    setInsights(next);
    onToast?.('Activity Insights cleared');
  };

  return (
    <section className="settings-section warm-card glass-card-inner activity-insights-section">
      <div className="section-header">
        <RefreshCw size={20} className="icon-teal" />
        <h3>Activity Insights</h3>
      </div>
      <p className="section-desc">
        Activity Insights help Curavon notice what tends to work, what gets blocked, and how to make
        future steps easier to understand.
      </p>
      <p className="settings-data-note">
        These insights are not a diagnosis and do not replace medical advice. They use your local
        Curavon activity, such as completed actions, blocked steps, check-ins, and saved safety notes.
        You can delete them by deleting health data.
      </p>

      <div className="activity-insights-list">
        {insights.length === 0 ? (
          <p className="activity-insights-empty">
            {loading ? 'Getting your Activity Insights ready…' : 'No Activity Insights yet. Try a check-in or next action first.'}
          </p>
        ) : (
          insights.map((insight) => (
            <article
              key={insight.id}
              className={`activity-insight-card activity-insight-card--${insight.tone}`}
            >
              <h4>{insight.title}</h4>
              <p>{insight.body}</p>
              {insight.evidence.length > 0 ? (
                <ul className="activity-insight-evidence">
                  {insight.evidence.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              <p className="activity-insight-source">Based on your Curavon activity</p>
            </article>
          ))
        )}
      </div>

      <div className="settings-actions-list">
        <button
          type="button"
          className="btn btn-secondary btn-glass"
          onClick={handleRefresh}
          disabled={loading}
        >
          {aiRefreshing ? 'Refreshing…' : 'Refresh insights'}
        </button>
        <button type="button" className="btn btn-secondary btn-glass" onClick={handleClear}>
          Clear Activity Insights
        </button>
      </div>
    </section>
  );
}
