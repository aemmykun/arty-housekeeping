# Roster Logic (Spec)

Constraints:
- 1 Houseman every day.
- 1 Common Area (Mon–Fri).
- Add 1 Supervisor if total task minutes > 1800 (weekday only if staff adequate).
- Housekeepers: 300–360 minutes per person.
- Work window: 08:30–15:00.
- If staff insufficient on weekdays, manager covers instead of adding supervisor.

Estimation:
- 1BR=35m, 2BR=45m, 3BR=60m (adjust per property).

2-line pseudo-code (illustrative only):
```
need_hk = ceil(total_minutes/330); assign(HM=1, CA=weekday?1:0, SUP=(weekday and total_minutes>1800 and enough_HK)?1:0)
allocate_tasks_by_minutes(rooms, staff, 330)
```
