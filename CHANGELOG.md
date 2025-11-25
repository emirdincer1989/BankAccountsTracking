# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-11-07

### Fixed
- **Modal System Issues**
  - Fixed modal backdrop persisting after save operations
  - Fixed modal confirmation race condition using flag-based resolution
  - Fixed double modal opening due to duplicate event listeners
  - Added manual backdrop cleanup in all CRUD save functions

- **Event Listener Management**
  - Fixed event listener duplication on page reload
  - Added `dataset.listenerAdded` guard to all button event listeners
  - Removed duplicate global event listeners from `hybrid-layout.html`

- **User Management**
  - Fixed user edit modal fields not populating correctly
  - Fixed role dropdown timing issues with retry mechanism
  - Added PostgreSQL unique constraint error handling
  - Added password requirements hint to user modal
  - Changed from soft delete to hard delete implementation

- **Menu Management**
  - Fixed empty category dropdown in new menu modal
  - Updated `updateMenuCategorySelect()` to fetch from API instead of stale global variable
  - Made `showMenuModal()` async with proper timing

- **Panel Settings**
  - Fixed form fields not loading current values
  - Added `loadCurrentSettings()` function to pre-populate system title and footer brand

### Changed
- **Delete Operations**: Changed from soft delete (UPDATE is_active = false) to hard delete (DELETE FROM)
- **Auto-Reload**: All CRUD save operations now automatically reload the page
- **Error Messages**: Improved user-facing error messages for better UX
- **Notifications**: Standardized all success/error notifications using toast system

### Added
- **Database Utility**: Created `scripts/clean-users.js` to remove test users
- **Authentication**: Added authentication middleware to panel settings endpoints
- **Logging**: Enhanced console logging for debugging modal and CRUD operations

### Technical Details
- **Files Modified**:
  - `assets/pages/users.js` - Event listener guards and CRUD connections
  - `assets/pages/roles.js` - Event listener guards
  - `assets/pages/menus.js` - Event listener guards for all 6 button types
  - `assets/pages/panel-settings.js` - Added loadCurrentSettings()
  - `assets/js/modal-utils.js` - Flag-based confirmation resolution
  - `hybrid-layout.html` - Multiple CRUD function updates
  - `routes/users.js` - Hard delete implementation, error handling
  - `routes/panel-settings.js` - Added authentication

- **New Files**:
  - `scripts/clean-users.js` - Database cleanup utility

### Removed
- Global event listeners from `hybrid-layout.html` (lines 1984-2066)
- Soft delete logic from user deletion endpoint

---

## Version History

### [1.0.0] - 2025-11-06
- Initial release of RBUMS (Role-Based User Management System)
- Complete user, role, and menu management
- PostgreSQL database with full security
- Modular page system
- Bootstrap 5 UI with dark theme
- JWT authentication
- Comprehensive logging and audit trails
