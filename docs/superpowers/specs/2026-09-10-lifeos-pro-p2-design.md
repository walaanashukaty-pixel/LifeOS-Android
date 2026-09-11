# LifeOS Pro P2 Design

## Goal
Complete the final priority stage from the approved LifeOS Pro prompt without redesigning Free: add a compact Pro dashboard insight, local AI analytics, and transparent adaptive personalization that learns only from the user's LifeOS review history when memory is enabled.

## Dashboard Pro
- Keep Free dashboard unchanged.
- Build insight locally from already-loaded LifeOS data; no AI/provider request on dashboard load.
- Show `✨ LifeOS يقترح لك`, up to three concrete priorities, `عرض خطتي`, and `اسأل LifeOS`.
- Buttons only navigate into existing LifeOS Agent modes (`day_plan` and `what_now`).

## AI Analytics
- Compute a rolling seven-day view locally from tasks/habits and their existing history.
- Show task completion, habit completion, strongest completion hour when supported, strongest weekday when supported, a concise observed pattern, and one recommendation.
- Never invent a pattern when evidence is insufficient.
- Surface this inside the existing LifeOS AI hub for Pro; keep the current Free assistant unchanged.

## Adaptive Personalization
- Recent daily reflections are the learning source for this stage.
- Derive bounded hints such as lighter plans, fewer priorities, reminders, energy-aware work, or more buffers.
- Do not silently rewrite the user's onboarding/profile fields.
- Only include adaptive hints in server AI context when personal memory is enabled.
- AI data access and memory controls remain authoritative.

## Safety / Performance
- No dashboard provider call.
- No new external integration.
- No automatic destructive actions.
- Existing preview -> confirm -> execute flow remains unchanged.
- No Malaak code/tables/functions are touched.
