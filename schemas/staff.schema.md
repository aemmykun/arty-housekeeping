# Staff CSV Schema

- `staff_id` (string, unique)
- `name` (string)
- `role` (RA|HM|CA|SUP|MGR)
- `availability` (MON..SUN pipe or comma list; e.g., MON,TUE,WED)
- `max_minutes_per_day` (int, default 300-360)
