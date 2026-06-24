# DeadZone Normalized Database Shape

`users` stores one row per account:
- identity: `id`, `username`, `email`, `password`
- verification: `email_verified`, `email_verified_at`
- player totals: `total_kills`, `total_assists`, `total_deaths`, `wallet`, `xp`
- current loadout ids: `outfit_id`, `weapon_id`, `weapon_skin_id`, `grenade_skin_id`
- role: `admin`

Repeated values are stored outside `users`:
- `user_owned_outfits(user_id, sort_order, outfit_id)`
- `user_owned_weapon_skins(user_id, sort_order, skin_id)`
- `user_owned_grenade_skins(user_id, sort_order, skin_id)`
- `user_owned_accessories(user_id, sort_order, accessory_id)`
- `user_equipped_accessories(user_id, sort_order, accessory_id)`
- `user_weapon_upgrades(user_id, weapon_id, upgrade_level)`
- `user_claimed_missions(user_id, sort_order, mission_id)`
- `user_map_plays(user_id, map_id, plays)`
- `user_weapon_kills(user_id, weapon_id, kills)`

Email verification:
- `email_verification_tokens(id, token, user_id, expires_at, used_at)`
- New users are saved with `email_verified = false`.
- Register creates a 15-minute 6-digit code and sends it by email.
- Login is blocked until the code is submitted.
- Unused old codes are deleted before sending a new one.

Normalization rules applied:
- 1NF: no comma-separated lists or mission JSON blobs in `users`.
- 2NF: inventory, loadout accessories, upgrades, and mission counters depend on the whole user/item key.
- 3NF: verification token state is isolated from account profile data.
