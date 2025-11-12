# Telegram Supergroup Configuration Template

**Grepable Tag:** `[#TELEGRAM:config-template]`  
**Version:** `1.8.0`  
**Last Updated:** November 2025  
**Classification:** Configuration Specification

---

## Overview

This template defines RFC (Request for Comment/Confirmation) pinning settings and human-in-loop thresholds for Telegram supergroup configurations. Each supergroup can have customized settings based on its operational requirements.

**Grepable Tag:** `[#TELEGRAM:config-template:overview]`

---

## Configuration Schema

**Grepable Tag:** `[#TELEGRAM:config-template:schema]`

```yaml
# Version: 1.8.0
# Configuration per Telegram Supergroup
# Enhanced Semantic Naming Convention - Searchable & Self-Documenting
#
# Grep Patterns Reference:
#   hil\.*              - All Human-in-Loop parameters
#   thresholds\.*       - All threshold trigger values
#   rfc_pinning\.*      - All RFC pinning configurations
#   telegram_alerts\.*  - All Telegram alert settings
#   escalation\.*       - All escalation path configs
#   topics\.*           - All topic/thread configurations
#   market_context\.*   - All market filtering configurations
#   _seconds$           - All time duration fields
#   _percent$           - All percentage threshold fields
#   _points$            - All point-based threshold fields

supergroup_configurations:
  - supergroup_id: -1003482161671
    supergroup_display_name: "🚨 Critical Steam Moves"
    
    # Topic/Thread Configuration
    # Each topic maps to a Telegram thread within the supergroup
    topics:
      steam_alerts:
        thread_id: 5
        topic_name: "🚨 Critical Steam Moves"
        enabled: true
      performance_metrics:
        thread_id: 7
        topic_name: "📈 Performance Metrics"
        enabled: true
      security_events:
        thread_id: 9
        topic_name: "🔐 Security Events"
        enabled: true
    
    # RFC (Request for Comments) Pinning Configuration
    rfc_pinning:
      enabled: true
      auto_pin_critical_thresholds: true
      auto_pin_high_thresholds: false
      pin_duration_seconds: 3600  # 1 hour: Duration RFC-pinned messages remain visible
    
    # Telegram Alert Transmission Controls
    telegram_alerts:
      cooldown_interval_seconds: 300  # 5 minutes: Throttle between similar alerts
      rate_limit_window_seconds: 60   # 1 minute: Rate limit time window
      pin_cooldown_seconds: 1800      # 30 minutes: Minimum time before re-pinning
    
    # Human-in-Loop (HIL) Response Management
    hil:
      response_window_seconds: 86400           # 24 hours: Human analyst RFC response time
      escalation_delay_seconds: 900            # 15 minutes: Wait before escalating
      acknowledgment_timeout_seconds: 600      # 10 minutes: Analyst acknowledgment deadline
      require_explicit_acknowledgment: true
      
      # Button-based acknowledgment system
      button_acknowledgment:
        enabled: true
        button_layout: "inline_keyboard"  # or "reply_keyboard"
        
        # Acknowledgment types with emoji and colors
        acknowledgment_types:
          - action: "acknowledge"
            button_text: "✅ Acknowledge"
            button_color: "green"
            requires_comment: false
            
          - action: "investigating"
            button_text: "🔍 Investigating"
            button_color: "blue"
            requires_comment: true
            comment_prompt: "Please provide investigation ETA"
            
          - action: "escalate"
            button_text: "🔄 Escalate"
            button_color: "orange"
            requires_comment: true
            comment_prompt: "Please specify escalation reason"
            
          - action: "false_positive"
            button_text: "❌ False Positive"
            button_color: "red"
            requires_comment: true
            comment_prompt: "Please explain why this is a false positive"
        
        # Response tracking
        track_acknowledgment_time: true
        track_responder_identity: true
        require_analyst_role: true
        allowed_analyst_roles: ["senior_trader", "risk_analyst", "team_lead"]
        
        # Confirmation flow
        confirmation_flow:
          enabled: true
          confirmation_message: "Please confirm your action: {action}"
          confirm_button_text: "Yes, Confirm"
          cancel_button_text: "Cancel"
          auto_delete_confirmations_seconds: 30
    
    # Analytics for Acknowledgment Performance
    hil_analytics:
      enabled: true
      
      metrics_tracking:
        - metric: "average_acknowledgment_time_seconds"
          alert_threshold: 300
        
        - metric: "acknowledgment_rate_percent"
          target: 95.0
        
        - metric: "false_positive_rate_percent"
          alert_threshold: 10.0
      
      # Response time SLAs
      response_slas:
        critical:
          target_seconds: 300
          warning_seconds: 600
        high:
          target_seconds: 600
          warning_seconds: 1200
        medium:
          target_seconds: 1800
          warning_seconds: 3600
      
      # Reporting
      daily_reports:
        enabled: true
        report_time_utc: "08:00"
        metrics:
          - "total_rfcs"
          - "acknowledgment_rate"
          - "average_response_time"
          - "escalation_rate"
          - "false_positive_rate"
    
    # Threshold Triggers for Human-in-Loop Intervention
    thresholds:
      steam_index_critical_percent: 15.0       # Steam index delta requiring HIL approval
      steam_index_high_percent: 10.0           # Steam index delta requiring HIL notification
      
      volume_spike_critical_percent: 300       # Volume anomaly (300% of baseline) requiring HIL approval
      volume_spike_high_percent: 200           # Volume anomaly (200% of baseline) requiring HIL notification
      
      odds_movement_critical_points: 50       # Odds movement (50 points) requiring HIL approval
      odds_movement_high_points: 30           # Odds movement (30 points) requiring HIL notification
    
    # Escalation Path Configuration
    escalation:
      primary_analyst_contacts: ["@analyst1", "@analyst2"]
      escalation_group_name: "senior_traders_supergroup"
      escalation_message_template: "URGENT: Unacknowledged RFC in {supergroup_name}"
      
      # Escalation triggers based on acknowledgment states
      escalation_triggers:
        - trigger: "no_acknowledgment"
          condition: "acknowledgment_timeout_seconds elapsed"
          action: "escalate_to_primary"
        
        - trigger: "investigation_stalled"
          condition: "investigating_state > 3600 seconds"
          action: "escalate_to_secondary"
        
        - trigger: "multiple_false_positives"
          condition: "3 false_positives in 1 hour"
          action: "escalate_to_team_lead"
    
    # Market & Sport Context
    market_context:
      market_type_filter: "steam_moves"
      sport_categories: ["NCAA Basketball", "NBA"]
      league_monitoring_scope: ["NCAAW", "NCAAM", "NBA"]
    
    # Message Templates with Interactive Elements
    message_templates:
      rfc_alert_template:
        template_name: "steam_move_rfc"
        format: "markdown"
        
        # Message structure with interactive components
        components:
          - type: "header"
            content: "🚨 RFC REQUIRED: Steam Move Detected"
          
          - type: "market_data"
            content: |
              **Market**: {market_name}
              **Steam Index**: `{steam_index_percent}%`
              **Volume Spike**: `{volume_spike_percent}%`
              **Odds Movement**: `{odds_movement_points}` points
          
          - type: "action_required"
            content: "Human approval required for this trade execution"
          
          - type: "button_group"
            name: "primary_actions"
            layout: "2x2"  # 2 rows, 2 columns
            buttons:
              - "hil.button_acknowledgment.acknowledge"
              - "hil.button_acknowledgment.investigating"
              - "hil.button_acknowledgment.escalate"
              - "hil.button_acknowledgment.false_positive"
          
          - type: "footer"
            content: "⏰ Response required within {response_window_minutes} minutes"
        
        # Dynamic content based on thresholds
        dynamic_visibility:
          show_urgency_badge: "thresholds.steam_index_critical_percent exceeded"
          highlight_color: "red"
    
    # Geographical and Environmental Tracking
    geographical_analysis:
      stadium_factors:
        elevation_tracking: true
        climate_impact: true
        surface_type: true  # grass vs turf
        dome_stadiums: true
      
      location_analytics:
        latitude_longitude_tracking: true
        time_zone_analysis: true
        travel_distance_calculation: true
      
      weather_impact:
        temperature_threshold_f: 30.0    # Extreme cold
        precipitation_threshold_in: 0.1  # Rain/snow impact
        wind_threshold_mph: 15.0         # Wind impact
        humidity_threshold_percent: 80.0 # High humidity
      
      # Days rest analysis
      rest_analysis:
        minimum_rest_hours: 24
        optimal_rest_hours: 48
        fatigue_threshold_hours: 20
        back_to_back_penalty_percent: 12.5

  # Example: Different configuration for Live Sports group
  - supergroup_id: 987654321
    supergroup_display_name: "⚽ Live Sports Moves"
    
    # Topic/Thread Configuration
    topics:
      live_sports_alerts:
        thread_id: 1
        topic_name: "⚽ Live Sports Alerts"
        enabled: true

  # Example: Staging/Testing Supergroup (for pre-production testing)
  - supergroup_id: -1001234567890  # Staging supergroup ID
    supergroup_display_name: "🧪 Staging - Steam Alerts Testing"
    
    # Topic/Thread Configuration
    topics:
      steam_alerts_staging:
        thread_id: 1
        topic_name: "🧪 Steam Alerts (Staging)"
        enabled: true
      performance_metrics_staging:
        thread_id: 2
        topic_name: "🧪 Performance Metrics (Staging)"
        enabled: true
      security_events_staging:
        thread_id: 3
        topic_name: "🧪 Security Events (Staging)"
        enabled: true
    
    # Staging-specific overrides
    thresholds:
      steam_index_critical_percent: 5.0   # Lower threshold for testing
      steam_index_high_percent: 3.0
      volume_spike_critical_percent: 150
      volume_spike_high_percent: 100
    
    telegram_alerts:
      cooldown_interval_seconds: 10      # Faster alerts in staging
      rate_limit_window_seconds: 5
    
    thresholds:
      steam_index_critical_percent: 5.0   # Lower threshold for testing
      steam_index_high_percent: 3.0
      volume_spike_critical_percent: 150
      volume_spike_high_percent: 100
      odds_movement_critical_points: 30
      odds_movement_high_points: 15
    
    escalation:
      primary_analyst_contacts: ["@staging_analyst"]
      escalation_group_name: "staging_testers_supergroup"
      escalation_message_template: "STAGING TEST: Action required in {supergroup_name}"
    
    market_context:
      market_type_filter: "steam_moves"
      sport_categories: ["NCAA Basketball", "NBA"]
      league_monitoring_scope: ["NCAAW", "NCAAM", "NBA"]
```

---

## Topics Configuration

**Grepable Tag:** `[#TELEGRAM:config-template:topics]`

### Topic Structure

Each supergroup can have multiple topics (threads) configured. Topics are organized by semantic keys and contain thread identification and metadata.

### Topic Configuration Schema

```yaml
topics:
  # Topic key (snake_case, descriptive)
  steam_alerts:
    thread_id: 5                    # Telegram thread/topic ID (positive integer)
    topic_name: "🚨 Critical Steam Moves"  # Display name
    enabled: true                    # Enable/disable alerts for this topic
  
  performance_metrics:
    thread_id: 7
    topic_name: "📈 Performance Metrics"
    enabled: true
  
  security_events:
    thread_id: 9
    topic_name: "🔐 Security Events"
    enabled: true
```

### Topic Naming Conventions

| Convention | Example | Description |
|------------|---------|-------------|
| **snake_case keys** | `steam_alerts`, `performance_metrics` | Topic identifier keys |
| **Descriptive names** | `steam_alerts` vs `topic1` | Self-documenting keys |
| **Consistent patterns** | `{category}_{type}` | Group related topics |
| **thread_id** | Positive integer | Telegram topic identifier |

### Standard Topic Types

```yaml
# Standard topic types for reference
topics:
  # Alert Topics
  steam_alerts:          # Critical steam movement alerts
  market_alerts:         # General market alerts
  security_events:       # Security and system events
  
  # Metrics Topics
  performance_metrics:   # System performance metrics
  trading_metrics:       # Trading performance metrics
  
  # Operational Topics
  system_status:         # System health and status
  maintenance:          # Maintenance notifications
```

### Topic Routing Logic

```typescript
interface TopicConfig {
  thread_id: number;
  topic_name: string;
  enabled: boolean;
}

function routeAlertToTopic(
  alertType: string,
  topics: Record<string, TopicConfig>
): number | null {
  // Route based on alert type to appropriate topic
  const topicKey = getTopicKeyForAlertType(alertType);
  const topic = topics[topicKey];
  
  if (!topic || !topic.enabled) {
    return null; // No routing or topic disabled
  }
  
  return topic.thread_id;
}
```

---

## Enhanced Field Definitions with Semantic Naming

**Grepable Tag:** `[#TELEGRAM:config-template:fields]`

### Configuration Parameters

| Field Path | Type | Unit | Semantic Description | Default |
|------------|------|------|----------------------|---------|
| `supergroup_id` | integer | - | Telegram supergroup identifier (negative integer) | Required |
| `supergroup_display_name` | string | - | Display name for the supergroup | Required |
| `topics.{topic_key}.thread_id` | integer | - | Telegram topic/thread identifier within supergroup | Required |
| `topics.{topic_key}.topic_name` | string | - | Display name for the topic/thread | Required |
| `topics.{topic_key}.enabled` | boolean | - | Enable alerts for this topic | `true` |
| `rfc_pinning.enabled` | boolean | - | Enable RFC pinning functionality | `false` |
| `rfc_pinning.auto_pin_critical_thresholds` | boolean | - | Automatically pin critical threshold alerts | `false` |
| `rfc_pinning.auto_pin_high_thresholds` | boolean | - | Automatically pin high-priority threshold alerts | `false` |
| `rfc_pinning.pin_duration_seconds` | integer | seconds | Duration RFC-pinned messages remain visible in supergroup | `3600` |
| `telegram_alerts.cooldown_interval_seconds` | integer | seconds | Throttle interval between duplicate alert transmissions | `300` |
| `telegram_alerts.rate_limit_window_seconds` | integer | seconds | Rate limit time window for alert throttling | `60` |
| `telegram_alerts.pin_cooldown_seconds` | integer | seconds | Minimum time before re-pinning same alert type | `1800` |
| `hil.response_window_seconds` | integer | seconds | Human analyst RFC response time before auto-escalation | `86400` |
| `hil.escalation_delay_seconds` | integer | seconds | Waiting period before escalating unacknowledged RFCs | `900` |
| `hil.acknowledgment_timeout_seconds` | integer | seconds | Analyst acknowledgment deadline before escalation | `600` |
| `hil.require_explicit_acknowledgment` | boolean | - | Require explicit acknowledgment before action | `true` |
| `hil.button_acknowledgment.enabled` | boolean | - | Enable button-based acknowledgment system | `false` |
| `hil.button_acknowledgment.button_layout` | string | - | Button layout type ("inline_keyboard" or "reply_keyboard") | `"inline_keyboard"` |
| `hil.button_acknowledgment.acknowledgment_types` | array[object] | - | List of acknowledgment action types with buttons | `[]` |
| `hil.button_acknowledgment.track_acknowledgment_time` | boolean | - | Track time taken to acknowledge | `true` |
| `hil.button_acknowledgment.track_responder_identity` | boolean | - | Track who acknowledged the alert | `true` |
| `hil.button_acknowledgment.require_analyst_role` | boolean | - | Require analyst role to acknowledge | `false` |
| `hil.button_acknowledgment.allowed_analyst_roles` | array[string] | - | List of allowed analyst roles | `[]` |
| `hil.button_acknowledgment.confirmation_flow.enabled` | boolean | - | Enable confirmation flow for actions | `false` |
| `hil.button_acknowledgment.confirmation_flow.confirmation_message` | string | - | Confirmation message template | `""` |
| `hil.button_acknowledgment.confirmation_flow.auto_delete_confirmations_seconds` | integer | seconds | Auto-delete confirmation messages after time | `30` |
| `escalation.escalation_triggers` | array[object] | - | List of escalation trigger conditions | `[]` |
| `message_templates.{template_name}.template_name` | string | - | Template identifier name | Required |
| `message_templates.{template_name}.format` | string | - | Message format ("markdown" or "html") | `"markdown"` |
| `message_templates.{template_name}.components` | array[object] | - | Message component structure | `[]` |
| `message_templates.{template_name}.dynamic_visibility` | object | - | Dynamic visibility rules based on conditions | `{}` |
| `hil_analytics.enabled` | boolean | - | Enable HIL analytics tracking | `false` |
| `hil_analytics.metrics_tracking` | array[object] | - | List of metrics to track with thresholds/targets | `[]` |
| `hil_analytics.metrics_tracking[].metric` | string | - | Metric identifier name | Required |
| `hil_analytics.metrics_tracking[].alert_threshold` | float | - | Alert threshold value (if applicable) | - |
| `hil_analytics.metrics_tracking[].target` | float | - | Target value for metric (if applicable) | - |
| `hil_analytics.response_slas` | object | - | Response time SLAs by priority level | `{}` |
| `hil_analytics.response_slas.critical.target_seconds` | integer | seconds | Target response time for critical alerts | `300` |
| `hil_analytics.response_slas.critical.warning_seconds` | integer | seconds | Warning threshold for critical alerts | `600` |
| `hil_analytics.response_slas.high.target_seconds` | integer | seconds | Target response time for high-priority alerts | `600` |
| `hil_analytics.response_slas.high.warning_seconds` | integer | seconds | Warning threshold for high-priority alerts | `1200` |
| `hil_analytics.response_slas.medium.target_seconds` | integer | seconds | Target response time for medium-priority alerts | `1800` |
| `hil_analytics.response_slas.medium.warning_seconds` | integer | seconds | Warning threshold for medium-priority alerts | `3600` |
| `hil_analytics.daily_reports.enabled` | boolean | - | Enable daily analytics reports | `false` |
| `hil_analytics.daily_reports.report_time_utc` | string | - | UTC time for daily report generation (HH:MM format) | `"08:00"` |
| `hil_analytics.daily_reports.metrics` | array[string] | - | List of metrics to include in daily reports | `[]` |
| `thresholds.steam_index_critical_percent` | float | percentage | Steam index delta requiring HIL approval | `15.0` |
| `thresholds.steam_index_high_percent` | float | percentage | Steam index delta requiring HIL notification | `10.0` |
| `thresholds.volume_spike_critical_percent` | integer | percentage | Volume anomaly (percentage of baseline) requiring HIL approval | `300` |
| `thresholds.volume_spike_high_percent` | integer | percentage | Volume anomaly (percentage of baseline) requiring HIL notification | `200` |
| `thresholds.odds_movement_critical_points` | integer | points | Odds movement points requiring HIL approval | `50` |
| `thresholds.odds_movement_high_points` | integer | points | Odds movement points requiring HIL notification | `30` |
| `escalation.primary_analyst_contacts` | array[string] | - | List of primary analyst contact usernames | `[]` |
| `escalation.escalation_group_name` | string | - | Escalation supergroup identifier | `""` |
| `escalation.escalation_message_template` | string | - | Template for escalation messages (supports {supergroup_name}) | `""` |
| `market_context.market_type_filter` | string | - | Market type filter (e.g., "steam_moves", "live_sports") | `""` |
| `market_context.sport_categories` | array[string] | - | List of sport categories to monitor | `[]` |
| `market_context.league_monitoring_scope` | array[string] | - | List of leagues to monitor | `[]` |
| `geographical_analysis.stadium_factors.elevation_tracking` | boolean | - | Track stadium elevation impact | `false` |
| `geographical_analysis.stadium_factors.climate_impact` | boolean | - | Track climate impact on performance | `false` |
| `geographical_analysis.stadium_factors.surface_type` | boolean | - | Track surface type (grass vs turf) | `false` |
| `geographical_analysis.stadium_factors.dome_stadiums` | boolean | - | Track dome stadium factor | `false` |
| `geographical_analysis.location_analytics.latitude_longitude_tracking` | boolean | - | Track latitude/longitude coordinates | `false` |
| `geographical_analysis.location_analytics.time_zone_analysis` | boolean | - | Analyze time zone impact | `false` |
| `geographical_analysis.location_analytics.travel_distance_calculation` | boolean | - | Calculate travel distance impact | `false` |
| `geographical_analysis.weather_impact.temperature_threshold_f` | float | Fahrenheit | Extreme cold temperature threshold | `30.0` |
| `geographical_analysis.weather_impact.precipitation_threshold_in` | float | inches | Rain/snow impact threshold | `0.1` |
| `geographical_analysis.weather_impact.wind_threshold_mph` | float | mph | Wind impact threshold | `15.0` |
| `geographical_analysis.weather_impact.humidity_threshold_percent` | float | percentage | High humidity threshold | `80.0` |
| `geographical_analysis.rest_analysis.minimum_rest_hours` | integer | hours | Minimum rest hours required | `24` |
| `geographical_analysis.rest_analysis.optimal_rest_hours` | integer | hours | Optimal rest hours | `48` |
| `geographical_analysis.rest_analysis.fatigue_threshold_hours` | integer | hours | Fatigue threshold hours | `20` |
| `geographical_analysis.rest_analysis.back_to_back_penalty_percent` | float | percentage | Back-to-back game penalty percentage | `12.5` |

**Note:** Field paths use semantic naming conventions for improved searchability and clarity. See [Naming Convention Rationale](#naming-convention-rationale) below.

---

## Variable Reference

**Grepable Tag:** `[#TELEGRAM:config-template:variables]`

Quick reference for all configuration variables with `[#REF]` tags for cross-referencing.

### Core Configuration Variables

| Variable | `[#REF]` Tag | Description |
|----------|--------------|-------------|
| `supergroup_id` | `[#REF:supergroup_id]` | Telegram supergroup identifier (negative integer) |
| `supergroup_display_name` | `[#REF:supergroup_display_name]` | Display name for the supergroup |
| `topics` | `[#REF:topics]` | Topic/thread configuration object |
| `topics.{topic_key}.thread_id` | `[#REF:thread_id]` | Telegram topic/thread identifier |
| `topics.{topic_key}.topic_name` | `[#REF:topic_name]` | Display name for the topic |
| `topics.{topic_key}.enabled` | `[#REF:topic_enabled]` | Enable/disable alerts for topic |

### RFC Pinning Variables

| Variable | `[#REF]` Tag | Description |
|----------|--------------|-------------|
| `rfc_pinning.enabled` | `[#REF:rfc_pinning_enabled]` | Enable RFC pinning functionality |
| `rfc_pinning.auto_pin_critical_thresholds` | `[#REF:auto_pin_critical]` | Auto-pin critical threshold alerts |
| `rfc_pinning.auto_pin_high_thresholds` | `[#REF:auto_pin_high]` | Auto-pin high-priority alerts |
| `rfc_pinning.pin_duration_seconds` | `[#REF:pin_duration]` | Duration pinned messages remain visible |

### Telegram Alert Variables

| Variable | `[#REF]` Tag | Description |
|----------|--------------|-------------|
| `telegram_alerts.cooldown_interval_seconds` | `[#REF:cooldown_interval]` | Throttle interval between duplicate alerts |
| `telegram_alerts.rate_limit_window_seconds` | `[#REF:rate_limit_window]` | Rate limit time window |
| `telegram_alerts.pin_cooldown_seconds` | `[#REF:pin_cooldown]` | Minimum time before re-pinning |

### Human-in-Loop Variables

| Variable | `[#REF]` Tag | Description |
|----------|--------------|-------------|
| `hil.response_window_seconds` | `[#REF:response_window]` | Human analyst RFC response time |
| `hil.escalation_delay_seconds` | `[#REF:escalation_delay]` | Wait before escalating unacknowledged RFCs |
| `hil.acknowledgment_timeout_seconds` | `[#REF:acknowledgment_timeout]` | Analyst acknowledgment deadline |
| `hil.require_explicit_acknowledgment` | `[#REF:require_acknowledgment]` | Require explicit acknowledgment |
| `hil.button_acknowledgment.enabled` | `[#REF:button_acknowledgment_enabled]` | Enable button-based acknowledgment |
| `hil.button_acknowledgment.button_layout` | `[#REF:button_layout]` | Button layout type |
| `hil.button_acknowledgment.acknowledgment_types` | `[#REF:acknowledgment_types]` | List of acknowledgment action types |
| `hil.button_acknowledgment.track_acknowledgment_time` | `[#REF:track_acknowledgment_time]` | Track acknowledgment time |
| `hil.button_acknowledgment.track_responder_identity` | `[#REF:track_responder_identity]` | Track responder identity |
| `hil.button_acknowledgment.allowed_analyst_roles` | `[#REF:allowed_analyst_roles]` | Allowed analyst roles |
| `hil.button_acknowledgment.confirmation_flow` | `[#REF:confirmation_flow]` | Confirmation flow configuration |
| `hil_analytics.enabled` | `[#REF:hil_analytics_enabled]` | Enable HIL analytics tracking |
| `hil_analytics.metrics_tracking` | `[#REF:metrics_tracking]` | List of metrics to track |
| `hil_analytics.response_slas` | `[#REF:response_slas]` | Response time SLAs by priority |
| `hil_analytics.response_slas.critical` | `[#REF:response_sla_critical]` | Critical priority SLA targets |
| `hil_analytics.response_slas.high` | `[#REF:response_sla_high]` | High priority SLA targets |
| `hil_analytics.response_slas.medium` | `[#REF:response_sla_medium]` | Medium priority SLA targets |
| `hil_analytics.daily_reports` | `[#REF:daily_reports]` | Daily analytics reports configuration |
| `hil_analytics.daily_reports.report_time_utc` | `[#REF:report_time_utc]` | UTC time for daily report generation |
| `hil_analytics.daily_reports.metrics` | `[#REF:daily_report_metrics]` | Metrics included in daily reports |
| `escalation.escalation_triggers` | `[#REF:escalation_triggers]` | Escalation trigger conditions |
| `message_templates` | `[#REF:message_templates]` | Message template configuration |
| `message_templates.{template_name}.components` | `[#REF:message_components]` | Message component structure |
| `message_templates.{template_name}.dynamic_visibility` | `[#REF:dynamic_visibility]` | Dynamic visibility rules |

### Threshold Variables

| Variable | `[#REF]` Tag | Description |
|----------|--------------|-------------|
| `thresholds.steam_index_critical_percent` | `[#REF:steam_index_critical]` | Steam index delta requiring HIL approval |
| `thresholds.steam_index_high_percent` | `[#REF:steam_index_high]` | Steam index delta requiring notification |
| `thresholds.volume_spike_critical_percent` | `[#REF:volume_spike_critical]` | Volume anomaly requiring HIL approval |
| `thresholds.volume_spike_high_percent` | `[#REF:volume_spike_high]` | Volume anomaly requiring notification |
| `thresholds.odds_movement_critical_points` | `[#REF:odds_movement_critical]` | Odds movement requiring HIL approval |
| `thresholds.odds_movement_high_points` | `[#REF:odds_movement_high]` | Odds movement requiring notification |

### Escalation Variables

| Variable | `[#REF]` Tag | Description |
|----------|--------------|-------------|
| `escalation.primary_analyst_contacts` | `[#REF:primary_contacts]` | List of primary analyst contacts |
| `escalation.escalation_group_name` | `[#REF:escalation_group]` | Escalation supergroup identifier |
| `escalation.escalation_message_template` | `[#REF:escalation_template]` | Template for escalation messages |

### Market Context Variables

| Variable | `[#REF]` Tag | Description |
|----------|--------------|-------------|
| `market_context.market_type_filter` | `[#REF:market_type_filter]` | Market type filter string |
| `market_context.sport_categories` | `[#REF:sport_categories]` | List of sport categories |
| `market_context.league_monitoring_scope` | `[#REF:league_scope]` | List of leagues to monitor |
| `geographical_analysis.stadium_factors` | `[#REF:stadium_factors]` | Stadium factor tracking configuration |
| `geographical_analysis.location_analytics` | `[#REF:location_analytics]` | Location analytics configuration |
| `geographical_analysis.weather_impact` | `[#REF:weather_impact]` | Weather impact thresholds |
| `geographical_analysis.weather_impact.temperature_threshold_f` | `[#REF:temperature_threshold]` | Extreme cold temperature threshold |
| `geographical_analysis.weather_impact.precipitation_threshold_in` | `[#REF:precipitation_threshold]` | Rain/snow impact threshold |
| `geographical_analysis.weather_impact.wind_threshold_mph` | `[#REF:wind_threshold]` | Wind impact threshold |
| `geographical_analysis.weather_impact.humidity_threshold_percent` | `[#REF:humidity_threshold]` | High humidity threshold |
| `geographical_analysis.rest_analysis` | `[#REF:rest_analysis]` | Rest analysis configuration |
| `geographical_analysis.rest_analysis.minimum_rest_hours` | `[#REF:minimum_rest_hours]` | Minimum rest hours required |
| `geographical_analysis.rest_analysis.optimal_rest_hours` | `[#REF:optimal_rest_hours]` | Optimal rest hours |
| `geographical_analysis.rest_analysis.fatigue_threshold_hours` | `[#REF:fatigue_threshold]` | Fatigue threshold hours |
| `geographical_analysis.rest_analysis.back_to_back_penalty_percent` | `[#REF:back_to_back_penalty]` | Back-to-back game penalty percentage |

### Usage

Search for variables using `[#REF]` tags:

```bash
# Find all variable references
rg '\[#REF:.*?\]' docs/TELEGRAM-CONFIG-TEMPLATE.md

# Find specific variable
rg '\[#REF:thread_id\]' docs/

# Find all threshold variables
rg '\[#REF:.*critical\]' docs/
```

---

## Reference Validation System

**Grepable Tag:** `[#TELEGRAM:config-template:reference-validation]`

### Overview

The reference validation system ensures all `[#REF]` tags are properly documented and provides tooling for automated validation, documentation generation, and IDE integration.

### Cross-Reference Mapping

```yaml
# Reference mapping for automated validation
reference_validation:
  required_references:
    core: ["supergroup_id", "supergroup_display_name"]
    thresholds: ["steam_index_critical", "volume_spike_critical"]
    hil: ["response_window", "escalation_delay"]
  
  dependency_graph:
    hil_settings:
      depends_on: ["response_window", "acknowledgment_timeout"]
      triggers: ["escalation_delay"]
    alerting:
      depends_on: ["cooldown_interval", "rate_limit_window"]
      triggers: ["pin_cooldown"]
```

### Search & Validation Commands

The `scripts/ref-validator.sh` script provides automated reference validation:

```bash
# Validate all references in configuration file
./scripts/ref-validator.sh configs/telegram-config.yaml

# Validate and generate reference documentation
./scripts/ref-validator.sh configs/telegram-config.yaml REFERENCE.md

# Find all references
./scripts/ref-validator.sh configs/telegram-config.yaml | grep "\[#REF:"
```

### Reference Categories by Domain

| Domain | Key References | Usage Context |
|--------|----------------|---------------|
| **Core** | `[#REF:supergroup_id]` `[#REF:thread_id]` | Group identification |
| **Alerting** | `[#REF:cooldown_interval]` `[#REF:rate_limit_window]` | Message throttling |
| **HIL** | `[#REF:response_window]` `[#REF:escalation_delay]` | Human workflow |
| **Analytics** | `[#REF:hil_analytics_enabled]` `[#REF:metrics_tracking]` | Performance tracking |
| **Thresholds** | `[#REF:steam_index_critical]` `[#REF:volume_spike_high]` | Alert triggers |
| **Escalation** | `[#REF:primary_contacts]` `[#REF:escalation_group]` | Failure paths |
| **Templates** | `[#REF:message_templates]` `[#REF:message_components]` | Message formatting |

### Common Search Patterns

```bash
# Find all threshold variables
grep -E '\[#REF:.*(critical|high|medium)\]' config.yaml

# Find time-based configurations  
grep -E '\[#REF:.*(window|delay|timeout|interval)\]' config.yaml

# Find telegram-specific settings
grep -E '\[#REF:(cooldown|rate_limit|pin)\]' config.yaml

# Validate all references are documented
./scripts/ref-validator.sh config.yaml
```

### IDE Integration

VS Code snippets are available in `.vscode/telegram-config.code-snippets`:

- Type `ref` and press Tab to insert `[#REF:variable_name]`
- Type `tag` and press Tab to insert `[#TELEGRAM:config-template:section]`

VS Code settings (`.vscode/settings.json`) include:
- YAML file associations
- Spell check dictionary for configuration terms
- Tab size and formatting preferences

### Automated Quality Checks

GitHub Actions workflow (`.github/workflows/validate-references.yml`) automatically:

1. Validates references on YAML file changes
2. Generates reference documentation on main branch pushes
3. Commits updated documentation automatically

### Validation Script Functions

The `ref-validator.sh` script provides three main functions:

1. **find_references()**: Extracts all `[#REF:...]` tags from configuration
2. **validate_references()**: Checks all references are documented in Variable Reference section
3. **generate_ref_docs()**: Creates markdown documentation listing all references

---

## Configuration Reference Quick Guide

**Grepable Tag:** `[#TELEGRAM:config-template:quick-guide]`

### Common Search Patterns

```bash
# Find all threshold variables
grep -E '\[#REF:.*(critical|high|medium)\]' config.yaml

# Find time-based configurations  
grep -E '\[#REF:.*(window|delay|timeout|interval)\]' config.yaml

# Find telegram-specific settings
grep -E '\[#REF:(cooldown|rate_limit|pin)\]' config.yaml

# Validate all references are documented
./scripts/ref-validator.sh config.yaml
```

### Reference Categories by Domain

| Domain | Key References | Usage Context |
|--------|----------------|---------------|
| **Core** | `[#REF:supergroup_id]` `[#REF:thread_id]` | Group identification |
| **Alerting** | `[#REF:cooldown_interval]` `[#REF:rate_limit_window]` | Message throttling |
| **HIL** | `[#REF:response_window]` `[#REF:escalation_delay]` | Human workflow |
| **Analytics** | `[#REF:hil_analytics_enabled]` `[#REF:metrics_tracking]` | Performance tracking |
| **Thresholds** | `[#REF:steam_index_critical]` `[#REF:volume_spike_high]` | Alert triggers |
| **Escalation** | `[#REF:primary_contacts]` `[#REF:escalation_group]` | Failure paths |
| **Templates** | `[#REF:message_templates]` `[#REF:message_components]` | Message formatting |
| **Geographical** | `[#REF:stadium_factors]` `[#REF:weather_impact]` `[#REF:rest_analysis]` | Environmental context |

### Automated Quality Checks

The GitHub Actions workflow (`.github/workflows/validate-references.yml`) automatically validates references:

```yaml
# GitHub Actions workflow for reference validation
name: Validate Configuration References

on:
  push:
    paths:
      - '**/*.yaml'
      - '**/*.yml'

jobs:
  validate-references:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Validate references
        run: |
          chmod +x ./scripts/ref-validator.sh
          ./scripts/ref-validator.sh ./configs/telegram-config.yaml
      
      - name: Generate reference docs
        run: |
          ./scripts/ref-validator.sh ./configs/telegram-config.yaml REFERENCE.md
          git add REFERENCE.md
          git commit -m "Update reference documentation" || echo "No changes to commit"
```

### Benefits of Reference System

This reference system transforms your configuration from a static document into a living, verifiable specification. The `[#REF]` tags create explicit contracts between configuration elements, making it much easier to:

1. **Track dependencies** between settings
2. **Validate completeness** during reviews
3. **Generate documentation** automatically
4. **Onboard new team members** quickly
5. **Refactor safely** with clear impact analysis

The tooling around it ensures the references stay accurate as the configuration evolves.

---

## Grep Patterns & Search Context

**Grepable Tag:** `[#TELEGRAM:config-template:grep-patterns]`

### Domain-Specific Searches

```bash
# All RFC pinning configurations
grep -r "rfc_pinning\." config/

# All Telegram alert settings
grep -r "telegram_alerts\." config/

# All Human-in-Loop parameters
grep -r "hil\." config/

# All threshold values
grep -r "thresholds\." config/

# All topic/thread configurations
grep -r "topics\." config/

# Find specific topic thread IDs
grep -r "thread_id:" config/

# All market context settings
grep -r "market_context\." config/
```

### Metric-Type Searches

```bash
# All duration/time settings
grep -r "_seconds" config/

# All percentage thresholds
grep -r "_percent" config/

# All point-based thresholds
grep -r "_points" config/
```

### Functional Searches

```bash
# Escalation-related settings
grep -r "escalation" config/

# Acknowledgment/response settings
grep -r "acknowledgment\|response_window" config/

# Cooldown/throttle settings
grep -r "cooldown\|throttle" config/
```

### Advanced Pattern Matching

```bash
# Find all HIL timeout configurations
rg "hil\..*_seconds" config/

# Find all critical thresholds
rg "critical_percent|critical_points" config/

# Find all escalation delays
rg "escalation.*delay|hil\.escalation_delay" config/

# Find all pinning-related settings
rg "pin.*duration|pin.*cooldown|auto_pin" config/
```

---

## Naming Convention Rationale

**Grepable Tag:** `[#TELEGRAM:config-template:naming-rationale]`

| Convention | Purpose | Example |
|------------|---------|---------|
| **Path-based scoping** | Prevents naming collisions | `rfc_pinning.pin_duration_seconds` vs `hil.acknowledgment_timeout_seconds` |
| **Domain prefixes** | Enables domain-specific searches | `hil_`, `telegram_`, `thresholds_` |
| **Semantic suffixes** | Clarifies data type and unit | `_seconds`, `_percent`, `_count`, `_points` |
| **Explicit context** | Self-documenting configuration | `telegram_alerts.cooldown_interval_seconds` is unambiguous |
| **Abbreviation consistency** | Standardized domain abbreviations | `hil` (Human-in-Loop), `rfc` (Request for Comment) |

### Benefits

1. **Searchability**: Domain prefixes enable targeted searches (`hil.*`, `telegram_*`)
2. **Type Safety**: Suffixes (`_seconds`, `_percent`) communicate data types
3. **Namespace Isolation**: Path-based scoping prevents conflicts
4. **Self-Documentation**: Names convey purpose without comments
5. **Maintainability**: Consistent patterns reduce cognitive load

This structure transforms generic identifiers into searchable, context-rich parameters that clearly communicate purpose, scope, and data type.

### Semantic Naming Convention Details

| Element | Pattern | Example | Search Command |
|---------|---------|---------|----------------|
| **Domain Prefix** | `hil.*`, `rfc_pinning.*` | `hil.response_window_seconds` | `grep -r "^hil\." config/` |
| **Data Type Suffix** | `*_seconds`, `*_percent` | `pin_duration_seconds` | `grep -r "_seconds:" config/` |
| **Context Path** | `telegram_alerts.*` | `telegram_alerts.cooldown_interval_seconds` | `grep -r "telegram_alerts\." config/` |
| **Severity Level** | `*_critical_*`, `*_high_*` | `steam_index_critical_percent` | `grep -r "critical_" config/` |
| **Topic Mapping** | `topics.*.thread_id` | `topics.steam_alerts.thread_id` | `grep -r "thread_id:" config/` |
| **Market Filter** | `market_context.*` | `market_context.sport_categories` | `grep -r "market_context\." config/` |

**Key Improvements:**

- ✅ **Descriptive**: `escalation_delay_seconds` vs generic `delay`
- ✅ **Semantic**: `hil.response_window_seconds` vs `timeout`
- ✅ **Grepable**: Consistent prefix `hil.` groups all human-in-loop configs
- ✅ **Type-Safe**: Suffix `_seconds`, `_percent` indicates expected units
- ✅ **Topic-Aware**: `topics.{topic_key}.thread_id` enables per-topic routing
- ✅ **Context-Rich**: `market_context.*` enables market-specific filtering

---

## Human-in-Loop Workflow

**Grepable Tag:** `[#TELEGRAM:config-template:workflow]`

### Workflow Steps

1. **Threshold Breached** → System generates RFC alert
2. **Auto-Pin** (if enabled & critical) → Message pinned for visibility
3. **Notification** → Primary contacts alerted via DM/mention
4. **Acknowledgment Window** → `acknowledgment_timeout_seconds` begins
5. **Human Decision** → Approve/reject/modify action
6. **Timeout Handling** → Auto-escalate if no response in `response_window_seconds`
7. **Pin Removal** → Pin automatically removed after `pin_duration_seconds`

### Workflow Diagram

```
┌─────────────────┐
│ Threshold       │
│ Breached        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate RFC    │
│ Alert           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│ Auto-Pin?       │ YES  │ Pin Message     │
│ (if critical)   ├──────┤ (duration)      │
└────────┬────────┘      └─────────────────┘
         │ NO
         ▼
┌─────────────────┐
│ Notify Primary  │
│ Contacts        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Wait for        │
│ Acknowledgment  │
│ (acknowledgment_timeout_seconds) │
└────────┬────────┘
         │
         ├─── Acknowledged ───► Human Decision ───► Action
         │
         └─── Timeout ───► Escalate ───► Senior Team
```

---

## Configuration Examples

**Grepable Tag:** `[#TELEGRAM:config-template:examples]`

### Example 1: Critical Steam Moves Supergroup

**Use Case:** High-stakes trading alerts requiring immediate human review

```yaml
supergroup_id: -1003482161671
supergroup_display_name: "🚨 Critical Steam Moves"

# Topic/Thread Configuration
topics:
  steam_alerts:
    thread_id: 5
    topic_name: "🚨 Critical Steam Moves"
    enabled: true
  performance_metrics:
    thread_id: 7
    topic_name: "📈 Performance Metrics"
    enabled: true
  security_events:
    thread_id: 9
    topic_name: "🔐 Security Events"
    enabled: true

rfc_pinning:
  enabled: true
  auto_pin_critical_thresholds: true
  auto_pin_high_thresholds: true
  pin_duration_seconds: 7200  # 2 hours

telegram_alerts:
  cooldown_interval_seconds: 300
  rate_limit_window_seconds: 60
  pin_cooldown_seconds: 1800

hil:
  response_window_seconds: 3600  # 1 hour for critical moves
  escalation_delay_seconds: 600   # 10 min
  acknowledgment_timeout_seconds: 300  # 5 min for critical
  require_explicit_acknowledgment: true

hil_analytics:
  enabled: true
  
  metrics_tracking:
    - metric: "average_acknowledgment_time_seconds"
      alert_threshold: 300
    
    - metric: "acknowledgment_rate_percent"
      target: 95.0
    
    - metric: "false_positive_rate_percent"
      alert_threshold: 10.0
  
  response_slas:
    critical:
      target_seconds: 300
      warning_seconds: 600
    high:
      target_seconds: 600
      warning_seconds: 1200
    medium:
      target_seconds: 1800
      warning_seconds: 3600
  
  daily_reports:
    enabled: true
    report_time_utc: "08:00"
    metrics:
      - "total_rfcs"
      - "acknowledgment_rate"
      - "average_response_time"
      - "escalation_rate"
      - "false_positive_rate"

thresholds:
  steam_index_critical_percent: 15.0
  steam_index_high_percent: 10.0
  volume_spike_critical_percent: 300
  volume_spike_high_percent: 200
  odds_movement_critical_points: 50
  odds_movement_high_points: 30

escalation:
  primary_analyst_contacts: ["@senior_analyst", "@trading_lead"]
  escalation_group_name: "critical_trading_team"
  escalation_message_template: "URGENT: Unacknowledged RFC in {supergroup_name}"

market_context:
  market_type_filter: "steam_moves"
  sport_categories: ["NCAA Basketball", "NBA"]
  league_monitoring_scope: ["NCAAW", "NCAAM", "NBA"]
```

### Example 2: Performance Metrics Supergroup

**Use Case:** Monitoring and reporting, no pinning required

```yaml
supergroup_id: 987654321
supergroup_display_name: "📈 Performance Metrics"

# Topic/Thread Configuration
topics:
  performance_metrics:
    thread_id: 1
    topic_name: "📈 Performance Metrics"
    enabled: true

rfc_pinning:
  enabled: false
  auto_pin_critical_thresholds: false
  auto_pin_high_thresholds: false
  pin_duration_seconds: 0

telegram_alerts:
  cooldown_interval_seconds: 600  # 10 min
  rate_limit_window_seconds: 120
  pin_cooldown_seconds: 0

hil:
  response_window_seconds: 0
  escalation_delay_seconds: 0
  acknowledgment_timeout_seconds: 0
  require_explicit_acknowledgment: false

thresholds:
  steam_index_critical_percent: 25.0  # Higher threshold for metrics
  steam_index_high_percent: 15.0
  volume_spike_critical_percent: 500
  volume_spike_high_percent: 300
  odds_movement_critical_points: 75
  odds_movement_high_points: 50

escalation:
  primary_analyst_contacts: []
  escalation_group_name: ""
  escalation_message_template: ""

market_context:
  market_type_filter: "performance_metrics"
  sport_categories: []
  league_monitoring_scope: []
```

---

## Button-Based Acknowledgment System

**Grepable Tag:** `[#TELEGRAM:config-template:button-acknowledgment]`

### Overview

The button-based acknowledgment system provides interactive buttons in Telegram messages for analysts to quickly respond to RFC alerts without typing commands.

### Acknowledgment Types

| Action | Button Text | Color | Requires Comment | Use Case |
|--------|-------------|-------|------------------|----------|
| `acknowledge` | ✅ Acknowledge | Green | No | Standard acknowledgment |
| `investigating` | 🔍 Investigating | Blue | Yes | Requires investigation ETA |
| `escalate` | 🔄 Escalate | Orange | Yes | Requires escalation reason |
| `false_positive` | ❌ False Positive | Red | Yes | Requires explanation |

### Features

- **Role-Based Access**: `require_analyst_role` and `allowed_analyst_roles` control who can acknowledge
- **Time Tracking**: `track_acknowledgment_time` records response time
- **Identity Tracking**: `track_responder_identity` records who acknowledged
- **Confirmation Flow**: Optional confirmation step to prevent accidental clicks
- **Comment Requirements**: Some actions require comments for audit trail

### Button Layouts

- **inline_keyboard**: Buttons appear inline with the message (recommended)
- **reply_keyboard**: Buttons appear as reply options

---

## Message Templates with Interactive Elements

**Grepable Tag:** `[#TELEGRAM:config-template:message-templates]`

### Component Types

| Component Type | Description | Example |
|----------------|-------------|---------|
| `header` | Message header section | "🚨 RFC REQUIRED: Steam Move Detected" |
| `market_data` | Market information display | Market name, steam index, volume spike |
| `action_required` | Call-to-action text | "Human approval required" |
| `button_group` | Interactive button group | 2x2 layout with acknowledgment buttons |
| `footer` | Footer with timing info | "Response required within X minutes" |

### Dynamic Visibility

Message components can be conditionally displayed based on threshold conditions:

```yaml
dynamic_visibility:
  show_urgency_badge: "thresholds.steam_index_critical_percent exceeded"
  highlight_color: "red"
```

### Template Variables

Templates support variable substitution:
- `{market_name}` - Market identifier
- `{steam_index_percent}` - Steam index percentage
- `{volume_spike_percent}` - Volume spike percentage
- `{odds_movement_points}` - Odds movement in points
- `{response_window_minutes}` - Response window in minutes

---

## Geographical and Environmental Analysis

**Grepable Tag:** `[#TELEGRAM:config-template:geographical-analysis]`

### Overview

Geographical and environmental analysis tracks stadium factors, location analytics, weather impact, and rest analysis to provide context-aware trading insights.

### Stadium Factors

Stadium-specific factors that impact performance:

| Factor | Description | Impact |
|--------|-------------|--------|
| `elevation_tracking` | Track stadium elevation | High elevation affects performance |
| `climate_impact` | Track climate conditions | Temperature/humidity variations |
| `surface_type` | Track grass vs turf | Surface type affects gameplay |
| `dome_stadiums` | Track dome/indoor stadiums | Weather-independent venues |

### Location Analytics

Geographic location tracking and analysis:

| Feature | Description | Use Case |
|---------|-------------|----------|
| `latitude_longitude_tracking` | Track exact coordinates | Distance calculations |
| `time_zone_analysis` | Analyze time zone differences | Travel fatigue assessment |
| `travel_distance_calculation` | Calculate travel distances | Rest and fatigue analysis |

### Weather Impact Thresholds

Weather conditions that impact performance:

| Threshold | Unit | Default | Description |
|-----------|------|---------|-------------|
| `temperature_threshold_f` | Fahrenheit | 30.0°F | Extreme cold threshold |
| `precipitation_threshold_in` | inches | 0.1" | Rain/snow impact threshold |
| `wind_threshold_mph` | mph | 15.0 mph | Wind impact threshold |
| `humidity_threshold_percent` | percentage | 80.0% | High humidity threshold |

### Rest Analysis

Team rest and fatigue analysis:

| Metric | Unit | Default | Description |
|--------|------|---------|-------------|
| `minimum_rest_hours` | hours | 24 | Minimum rest required |
| `optimal_rest_hours` | hours | 48 | Optimal rest period |
| `fatigue_threshold_hours` | hours | 20 | Fatigue threshold |
| `back_to_back_penalty_percent` | percentage | 12.5% | Back-to-back game penalty |

### Implementation Example

```typescript
interface GeographicalAnalysis {
  stadium_factors: {
    elevation_tracking: boolean;
    climate_impact: boolean;
    surface_type: boolean;
    dome_stadiums: boolean;
  };
  location_analytics: {
    latitude_longitude_tracking: boolean;
    time_zone_analysis: boolean;
    travel_distance_calculation: boolean;
  };
  weather_impact: {
    temperature_threshold_f: number;
    precipitation_threshold_in: number;
    wind_threshold_mph: number;
    humidity_threshold_percent: number;
  };
  rest_analysis: {
    minimum_rest_hours: number;
    optimal_rest_hours: number;
    fatigue_threshold_hours: number;
    back_to_back_penalty_percent: number;
  };
}

function calculateRestFactor(
  hoursSinceLastGame: number,
  restConfig: GeographicalAnalysis['rest_analysis']
): number {
  if (hoursSinceLastGame < restConfig.fatigue_threshold_hours) {
    return 1.0 - restConfig.back_to_back_penalty_percent / 100;
  }
  if (hoursSinceLastGame >= restConfig.optimal_rest_hours) {
    return 1.0; // Optimal rest
  }
  // Linear interpolation between fatigue and optimal
  const factor = (hoursSinceLastGame - restConfig.fatigue_threshold_hours) /
    (restConfig.optimal_rest_hours - restConfig.fatigue_threshold_hours);
  return restConfig.fatigue_threshold_hours / restConfig.optimal_rest_hours + 
    factor * (1.0 - restConfig.fatigue_threshold_hours / restConfig.optimal_rest_hours);
}
```

---

## Escalation Triggers

**Grepable Tag:** `[#TELEGRAM:config-template:escalation-triggers]`

### Trigger Types

| Trigger | Condition | Action |
|---------|-----------|--------|
| `no_acknowledgment` | Timeout elapsed | Escalate to primary contacts |
| `investigation_stalled` | Investigating > 1 hour | Escalate to secondary |
| `multiple_false_positives` | 3 false positives in 1 hour | Escalate to team lead |

### Trigger Evaluation

Triggers are evaluated based on acknowledgment states and timing conditions. Each trigger can have custom escalation actions.

---

## HIL Analytics Configuration

**Grepable Tag:** `[#TELEGRAM:config-template:hil-analytics]`

### Overview

The HIL Analytics system tracks acknowledgment performance metrics, monitors SLA compliance, and generates daily reports for operational insights.

### Metrics Tracking

The system tracks three key metrics:

| Metric | Description | Threshold/Target |
|--------|-------------|-----------------|
| `average_acknowledgment_time_seconds` | Average time to acknowledge RFC alerts | Alert threshold: 300 seconds |
| `acknowledgment_rate_percent` | Percentage of RFCs acknowledged | Target: 95.0% |
| `false_positive_rate_percent` | Percentage of RFCs marked as false positives | Alert threshold: 10.0% |

### Response Time SLAs

Response time SLAs are defined by priority level:

| Priority | Target Seconds | Warning Seconds | Description |
|----------|----------------|-----------------|-------------|
| **Critical** | 300 (5 min) | 600 (10 min) | Critical threshold breaches |
| **High** | 600 (10 min) | 1200 (20 min) | High-priority alerts |
| **Medium** | 1800 (30 min) | 3600 (60 min) | Medium-priority alerts |

### Daily Reports

Daily reports are automatically generated at a configured UTC time and include:

- **total_rfcs**: Total number of RFC alerts generated
- **acknowledgment_rate**: Percentage of acknowledged RFCs
- **average_response_time**: Average acknowledgment time
- **escalation_rate**: Percentage of RFCs that escalated
- **false_positive_rate**: Percentage of false positives

### Analytics Implementation

```typescript
interface HILAnalytics {
  enabled: boolean;
  metrics_tracking: Array<{
    metric: string;
    alert_threshold?: number;
    target?: number;
  }>;
  response_slas: {
    critical: { target_seconds: number; warning_seconds: number };
    high: { target_seconds: number; warning_seconds: number };
    medium: { target_seconds: number; warning_seconds: number };
  };
  daily_reports: {
    enabled: boolean;
    report_time_utc: string;
    metrics: string[];
  };
}

function checkSLACompliance(
  responseTime: number,
  priority: 'critical' | 'high' | 'medium',
  slas: HILAnalytics['response_slas']
): 'target' | 'warning' | 'breach' {
  const sla = slas[priority];
  if (responseTime <= sla.target_seconds) return 'target';
  if (responseTime <= sla.warning_seconds) return 'warning';
  return 'breach';
}
```

---

## Implementation Notes

**Grepable Tag:** `[#TELEGRAM:config-template:implementation]`

### Configuration Loading

```typescript
// Example TypeScript interface with semantic naming conventions
interface TopicConfig {
  thread_id: number;
  topic_name: string;
  enabled: boolean;
}

interface SupergroupConfig {
  supergroup_id: number;
  supergroup_display_name: string;
  
  topics: Record<string, TopicConfig>;
  
  rfc_pinning: {
    enabled: boolean;
    auto_pin_critical_thresholds: boolean;
    auto_pin_high_thresholds: boolean;
    pin_duration_seconds: number;
  };
  
  telegram_alerts: {
    cooldown_interval_seconds: number;
    rate_limit_window_seconds: number;
    pin_cooldown_seconds: number;
  };
  
  hil: {
    response_window_seconds: number;
    escalation_delay_seconds: number;
    acknowledgment_timeout_seconds: number;
    require_explicit_acknowledgment: boolean;
    
    button_acknowledgment?: {
      enabled: boolean;
      button_layout: "inline_keyboard" | "reply_keyboard";
      acknowledgment_types: Array<{
        action: string;
        button_text: string;
        button_color: "green" | "blue" | "orange" | "red";
        requires_comment: boolean;
        comment_prompt?: string;
      }>;
      track_acknowledgment_time: boolean;
      track_responder_identity: boolean;
      require_analyst_role: boolean;
      allowed_analyst_roles: string[];
      confirmation_flow?: {
        enabled: boolean;
        confirmation_message: string;
        confirm_button_text: string;
        cancel_button_text: string;
        auto_delete_confirmations_seconds: number;
      };
    };
  };
  
  hil_analytics?: {
    enabled: boolean;
    metrics_tracking: Array<{
      metric: string;
      alert_threshold?: number;
      target?: number;
    }>;
    response_slas: {
      critical: {
        target_seconds: number;
        warning_seconds: number;
      };
      high: {
        target_seconds: number;
        warning_seconds: number;
      };
      medium: {
        target_seconds: number;
        warning_seconds: number;
      };
    };
    daily_reports: {
      enabled: boolean;
      report_time_utc: string;
      metrics: string[];
    };
  };
  
  thresholds: {
    steam_index_critical_percent: number;
    steam_index_high_percent: number;
    volume_spike_critical_percent: number;
    volume_spike_high_percent: number;
    odds_movement_critical_points: number;
    odds_movement_high_points: number;
  };
  
  escalation: {
    primary_analyst_contacts: string[];
    escalation_group_name: string;
    escalation_message_template: string;
    escalation_triggers?: Array<{
      trigger: string;
      condition: string;
      action: string;
    }>;
  };
  
  market_context: {
    market_type_filter: string;
    sport_categories: string[];
    league_monitoring_scope: string[];
  };
  
  geographical_analysis?: {
    stadium_factors: {
      elevation_tracking: boolean;
      climate_impact: boolean;
      surface_type: boolean;
      dome_stadiums: boolean;
    };
    location_analytics: {
      latitude_longitude_tracking: boolean;
      time_zone_analysis: boolean;
      travel_distance_calculation: boolean;
    };
    weather_impact: {
      temperature_threshold_f: number;
      precipitation_threshold_in: number;
      wind_threshold_mph: number;
      humidity_threshold_percent: number;
    };
    rest_analysis: {
      minimum_rest_hours: number;
      optimal_rest_hours: number;
      fatigue_threshold_hours: number;
      back_to_back_penalty_percent: number;
    };
  };
  
  message_templates?: Record<string, {
    template_name: string;
    format: "markdown" | "html";
    components: Array<{
      type: string;
      content?: string;
      name?: string;
      layout?: string;
      buttons?: string[];
    }>;
    dynamic_visibility?: {
      show_urgency_badge?: string;
      highlight_color?: string;
    };
  }>;
}
```

### Validation Rules

1. **supergroup_id**: Must be a valid Telegram supergroup ID (negative integer)
2. **topics**: At least one topic must be configured with valid `thread_id` (positive integer)
3. **thread_id**: Must be a valid Telegram topic/thread identifier (positive integer)
4. **pin_duration_seconds**: Must be ≥ 0
5. **cooldown_interval_seconds**: Must be ≥ 0
6. **rate_limit_window_seconds**: Must be > 0 if rate limiting is enabled
7. **response_window_seconds**: Must be ≥ `acknowledgment_timeout_seconds` if `require_explicit_acknowledgment` is true
8. **thresholds**: All threshold values must be positive numbers
9. **primary_analyst_contacts**: Usernames must start with `@` if provided
10. **Semantic naming**: All field paths must follow semantic naming conventions (see [Naming Convention Rationale](#naming-convention-rationale))

---

## Validation Schema

**Grepable Tag:** `[#TELEGRAM:config-template:validation]`

### Configuration Validation Rules

```yaml
# Validation schema for configuration values
validation:
  required_fields: 
    - supergroup_id
    - supergroup_display_name
    - topics
    - thresholds
  
  value_ranges:
    percent_fields:
      min: 0
      max: 1000  # Allow up to 1000% for volume spikes
    
    seconds_fields:
      min: 0
      max: 2592000  # 30 days maximum
    
    points_fields:
      min: 0
      max: 1000  # Maximum odds movement points
  
  type_constraints:
    supergroup_id:
      type: integer
      must_be_negative: true
    
    thread_id:
      type: integer
      must_be_positive: true
    
    usernames:
      pattern: "^@[a-zA-Z0-9_]+$"
      max_length: 32
```

### Validation Implementation

```typescript
interface ValidationSchema {
  required_fields: string[];
  value_ranges: {
    percent_fields: { min: number; max: number };
    seconds_fields: { min: number; max: number };
    points_fields: { min: number; max: number };
  };
  type_constraints: {
    supergroup_id: { type: string; must_be_negative: boolean };
    thread_id: { type: string; must_be_positive: boolean };
    usernames: { pattern: string; max_length: number };
  };
}

function validateConfig(config: SupergroupConfig, schema: ValidationSchema): ValidationResult {
  // Implementation validates all fields against schema
}
```

---

## Environment Overrides

**Grepable Tag:** `[#TELEGRAM:config-template:environment-overrides]`

### Environment-Specific Configuration

```yaml
# Support for environment-specific overrides
environment_overrides:
  development:
    hil:
      response_window_seconds: 300  # 5 minutes for testing
      escalation_delay_seconds: 60  # 1 minute for faster testing
      acknowledgment_timeout_seconds: 120  # 2 minutes
    
    thresholds:
      steam_index_critical_percent: 5.0  # Lower thresholds in dev
      steam_index_high_percent: 3.0
      volume_spike_critical_percent: 150  # Lower volume thresholds
      volume_spike_high_percent: 100
    
    telegram_alerts:
      cooldown_interval_seconds: 10  # Faster alerts in dev
      rate_limit_window_seconds: 5
  
  staging:
    hil:
      response_window_seconds: 1800  # 30 minutes
      escalation_delay_seconds: 300
      acknowledgment_timeout_seconds: 180
    
    thresholds:
      steam_index_critical_percent: 10.0
      steam_index_high_percent: 7.0
  
  production:
    # Production values use base configuration
    # No overrides needed - use defaults from supergroup_configurations
```

### Environment Override Resolution

```typescript
function resolveConfigWithOverrides(
  baseConfig: SupergroupConfig,
  environment: 'development' | 'staging' | 'production',
  overrides: EnvironmentOverrides
): SupergroupConfig {
  const envOverrides = overrides[environment];
  if (!envOverrides) return baseConfig;
  
  return deepMerge(baseConfig, envOverrides);
}
```

---

## Monitoring Integration

**Grepable Tag:** `[#TELEGRAM:config-template:monitoring]`

### Observability Configuration

```yaml
# Monitoring and observability settings
monitoring:
  metrics_prefix: "telegram_bot"
  alert_on_config_reload: true
  health_check_endpoint: "/health"
  config_hash_tracking: true
  
  metrics:
    enabled: true
    export_interval_seconds: 60
    include_config_metrics: true
  
  logging:
    config_changes_log_level: "info"
    validation_errors_log_level: "error"
    performance_metrics_log_level: "debug"
  
  alerts:
    config_reload_failure: true
    validation_failure: true
    threshold_breach_rate: true
    threshold_breach_rate_threshold_percent: 10.0  # Alert if >10% breach rate
```

### Monitoring Metrics

```typescript
interface MonitoringConfig {
  metrics_prefix: string;
  alert_on_config_reload: boolean;
  health_check_endpoint: string;
  config_hash_tracking: boolean;
  metrics: {
    enabled: boolean;
    export_interval_seconds: number;
    include_config_metrics: boolean;
  };
  logging: {
    config_changes_log_level: string;
    validation_errors_log_level: string;
    performance_metrics_log_level: string;
  };
  alerts: {
    config_reload_failure: boolean;
    validation_failure: boolean;
    threshold_breach_rate: boolean;
    threshold_breach_rate_threshold_percent: number;
  };
}
```

---

## Backup Configuration

**Grepable Tag:** `[#TELEGRAM:config-template:backup]`

### Fallback Configuration

```yaml
# Fallback configuration for unknown or unconfigured supergroups
fallback_config:
  supergroup_id: 0  # Default config identifier
  supergroup_display_name: "Default Configuration"
  
  # Topic/Thread Configuration (Fallback)
  topics:
    default_alerts:
      thread_id: 1
      topic_name: "Default Alerts"
      enabled: true
  
  rfc_pinning:
    enabled: false
    auto_pin_critical_thresholds: false
    auto_pin_high_thresholds: false
    pin_duration_seconds: 0
  
  telegram_alerts:
    cooldown_interval_seconds: 300
    rate_limit_window_seconds: 60
    pin_cooldown_seconds: 0
  
  hil:
    response_window_seconds: 86400  # 24 hours
    escalation_delay_seconds: 900
    acknowledgment_timeout_seconds: 600
    require_explicit_acknowledgment: false
  
  thresholds:
    steam_index_critical_percent: 20.0  # Conservative defaults
    steam_index_high_percent: 12.0
    volume_spike_critical_percent: 400
    volume_spike_high_percent: 250
    odds_movement_critical_points: 75
    odds_movement_high_points: 50
  
  escalation:
    primary_analyst_contacts: []
    escalation_group_name: ""
    escalation_message_template: ""
  
  market_context:
    market_type_filter: ""
    sport_categories: []
    league_monitoring_scope: []
```

### Fallback Resolution Logic

```typescript
function getConfigForSupergroup(
  supergroupId: number,
  configs: SupergroupConfig[],
  fallback: SupergroupConfig
): SupergroupConfig {
  const config = configs.find(c => c.supergroup_id === supergroupId);
  return config || fallback;
}
```

---

## Security Considerations

**Grepable Tag:** `[#TELEGRAM:config-template:security]`

### Security Configuration

```yaml
# Security settings for configuration management
security:
  config_encryption: false  # Enable if storing sensitive data
  encryption_algorithm: "AES-256-GCM"  # If encryption enabled
  
  allowed_supergroup_ids: 
    - -1003482161671  # Production supergroup
    - -1001234567890  # Staging supergroup (for pre-production testing)
    - 987654321  # Test supergroup
  
  config_backup_retention_days: 30
  
  access_control:
    read_only_users: ["@readonly_bot"]
    admin_users: ["@admin_bot", "@config_manager"]
    require_authentication: true
  
  audit_logging:
    enabled: true
    log_config_changes: true
    log_access_attempts: true
    retention_days: 90
  
  secrets_management:
    telegram_bot_token_env_var: "TELEGRAM_BOT_TOKEN"
    encrypt_sensitive_fields: true
    sensitive_fields:
      - escalation.primary_analyst_contacts
      - security.admin_users
```

### Security Best Practices

1. **Never commit sensitive data**: Store bot tokens and credentials in environment variables
2. **Use encryption**: Enable `config_encryption` for production deployments
3. **Whitelist supergroups**: Use `allowed_supergroup_ids` to prevent unauthorized access
4. **Audit logging**: Enable audit logging for compliance and security monitoring
5. **Access control**: Implement role-based access control for configuration management
6. **Backup retention**: Configure appropriate backup retention periods

---

## Usage Examples

**Grepable Tag:** `[#TELEGRAM:config-template:usage-examples]`

### Python Example

```python
def get_thresholds_for_group(supergroup_id: int) -> dict:
    """Get thresholds using semantic search pattern"""
    config = load_yaml_config()
    group_config = next(
        (g for g in config['supergroup_configurations'] 
         if g['supergroup_id'] == supergroup_id), 
        None
    )
    return group_config['thresholds'] if group_config else {}

def find_all_duration_settings():
    """Find all _seconds fields across all groups"""
    # grep -r "_seconds:" config.yaml
    config = load_yaml_config()
    duration_fields = {}
    for group in config['supergroup_configurations']:
        for key, value in flatten_dict(group).items():
            if key.endswith('_seconds'):
                duration_fields[key] = value
    return duration_fields

def create_alert_message(group_config, market_data):
    """Create alert message with interactive buttons"""
    template = group_config['message_templates']['rfc_alert_template']
    buttons = []
    
    # Extract acknowledgment types from button acknowledgment config
    if group_config.get('hil', {}).get('button_acknowledgment', {}).get('enabled'):
        ack_config = group_config['hil']['button_acknowledgment']
        for ack_type in ack_config['acknowledgment_types']:
            buttons.append({
                'text': ack_type['button_text'],
                'callback_data': f"ack_{ack_type['action']}_{market_data['alert_id']}"
            })
    
    # Format message from template components
    message_text = format_template(template, market_data)
    
    # Create inline keyboard layout (2x2 grid)
    reply_markup = create_inline_keyboard(buttons, columns=2)
    
    return {
        'text': message_text,
        'reply_markup': reply_markup,
        'parse_mode': template.get('format', 'markdown')
    }

def format_template(template, market_data):
    """Format template with market data variables"""
    message_parts = []
    
    for component in template['components']:
        if component['type'] == 'header':
            message_parts.append(component['content'])
        elif component['type'] == 'market_data':
            content = component['content'].format(**market_data)
            message_parts.append(content)
        elif component['type'] == 'action_required':
            message_parts.append(component['content'])
        elif component['type'] == 'footer':
            # Calculate response window in minutes
            response_minutes = market_data.get('response_window_seconds', 600) // 60
            content = component['content'].format(response_window_minutes=response_minutes)
            message_parts.append(content)
    
    return '\n\n'.join(message_parts)

def create_inline_keyboard(buttons, columns=2):
    """Create Telegram inline keyboard from button list"""
    keyboard = []
    for i in range(0, len(buttons), columns):
        row = buttons[i:i + columns]
        keyboard.append(row)
    return {'inline_keyboard': keyboard}
```

### TypeScript Example

```typescript
function getThresholdsForGroup(
  supergroupId: number,
  configs: SupergroupConfig[]
): Thresholds | null {
  const groupConfig = configs.find(
    c => c.supergroup_id === supergroupId
  );
  return groupConfig?.thresholds || null;
}

function findAllDurationSettings(
  configs: SupergroupConfig[]
): Record<string, number> {
  const durationFields: Record<string, number> = {};
  
  configs.forEach(config => {
    Object.entries(flattenConfig(config)).forEach(([key, value]) => {
      if (key.endsWith('_seconds') && typeof value === 'number') {
        durationFields[key] = value;
      }
    });
  });
  
  return durationFields;
}
```

---

## Best Practices

**Grepable Tag:** `[#TELEGRAM:config-template:best-practices]`

1. **Critical Supergroups**: Use shorter `response_window_seconds` and `acknowledgment_timeout_seconds` for time-sensitive operations
2. **High-Volume Supergroups**: Increase `cooldown_interval_seconds` to prevent spam
3. **Monitoring Supergroups**: Disable pinning and set higher thresholds
4. **Escalation**: Always configure `primary_contacts` for critical supergroups
5. **Testing**: Start with conservative thresholds and adjust based on operational data
6. **Semantic Naming**: Use semantic field paths for improved searchability and maintainability

---

## Related Documentation

- [Telegram Alert System](./TELEGRAM.md) - `[#TELEGRAM:alert-system]` v2.0.0
- [Production System Overview](./PRODUCTION-SYSTEM.md) - `[#PROD:system-overview]` v1.2.0
- [Release v1.2.0](./RELEASE-v1.2.0.md) - `[#RELEASE:v1.2.0]` - System health monitoring enhancement

---

**Document Status:** ✅ **APPROVED FOR IMPLEMENTATION**  
**Last Reviewed:** November 11, 2025

---

## Version History

- **v1.8.0** - Added geographical and environmental analysis (stadium factors, location analytics, weather impact, rest analysis)
- **v1.7.0** - Added HIL analytics configuration (metrics tracking, response SLAs, daily reports), reference validation system with automated tooling, VS Code snippets, and GitHub Actions workflow
- **v1.6.0** - Added button-based acknowledgment system, message templates with interactive elements, and escalation triggers
- **v1.5.2** - Added Variable Reference section with `[#REF]` tags for all configuration variables
- **v1.5.1** - Organized and standardized topics configuration with dedicated section, naming conventions, and routing examples
- **v1.5.0** - Added validation schema, environment overrides, monitoring integration, backup configuration, security considerations, and usage examples
- **v1.4.0** - Added topic/thread_id configuration, market_context filtering, enhanced semantic naming with rate limiting
- **v1.3.0** - Enhanced field definitions with semantic naming, grep patterns, and naming convention rationale
- **v1.2.0** - Initial configuration template with RFC pinning and human-in-loop thresholds
