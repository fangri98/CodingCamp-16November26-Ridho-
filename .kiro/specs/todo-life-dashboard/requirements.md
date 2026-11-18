# Requirements Document

## Introduction

The To-Do List Life Dashboard is a single-page, browser-based personal productivity application built entirely with HTML, CSS, and Vanilla JavaScript. It consolidates task management, quick bookmark links, a personalized greeting, a live date/time display, and a light/dark theme into one modern, minimal, and aesthetic dashboard surface. The application runs without any build step, requires no backend services, and persists all user data — Tasks, Quick Links, and user preferences (Theme and User_Name) — in the browser's Local Storage so that data survives page refreshes and browser restarts.

The dashboard is responsive across desktop, tablet, and mobile form factors and is designed for daily personal use. Three specific challenges are implemented as core requirements: a Light/Dark Mode toggle with persisted preference, a custom user name displayed within the Greeting, and strict prevention of duplicate Task Names.

## Glossary

- **Dashboard**: The To-Do List Life Dashboard single-page web application as a whole.
- **Task**: A single to-do item consisting of a Task Name, a completion status, and an identifier, created by the user and persisted in Local Storage.
- **Task Name**: The human-readable text label of a Task. The trimmed, case-insensitive form of the Task Name is the uniqueness key for duplicate prevention.
- **Quick Link**: A bookmark entry consisting of a title and a URL, rendered as a clickable shortcut on the Dashboard and persisted in Local Storage.
- **Local Storage**: The browser Web Storage API (`window.localStorage`) used to persist Dashboard data as JSON strings keyed by application-specific Storage Keys.
- **Greeting**: The welcome message displayed at the top of the Dashboard, which incorporates the User_Name when one is set.
- **Theme**: The visual color mode of the Dashboard, either Light Mode or Dark Mode.
- **Light Mode**: The default visual Theme using a light color palette.
- **Dark Mode**: An alternative visual Theme using a dark color palette.
- **User_Name**: The custom name string entered by the user and displayed within the Greeting; persisted in Local Storage.
- **Application State**: The aggregate of all Tasks, Quick Links, Theme, and User_Name persisted in Local Storage at a given point in time.
- **Serializer**: The function that converts a component of Application State into a JSON string for Local Storage persistence.
- **Deserializer**: The function that converts a JSON string read from Local Storage back into a component of Application State.
- **Storage Key**: A named string key under which a component of Application State is stored in Local Storage.

## Requirements

### Requirement 1: Add Task

**User Story:** As a user, I want to add a new task to my dashboard, so that I can keep track of things I need to do.

#### Acceptance Criteria

1. WHEN the user submits a non-empty Task Name, THE Dashboard SHALL create a new Task and display the Task in the task list.
2. WHEN a new Task is created, THE Dashboard SHALL assign the Task an identifier unique within the current task collection.
3. WHEN the user submits an empty or whitespace-only Task Name, THE Dashboard SHALL reject the input and SHALL not create a Task.
4. THE Dashboard SHALL trim leading and trailing whitespace from a submitted Task Name before creating a Task.

### Requirement 2: Prevent Duplicate Tasks

**User Story:** As a user, I want the dashboard to reject duplicate task names, so that my task list stays clean and unambiguous.

#### Acceptance Criteria

1. IF the submitted Task Name matches an existing Task Name ignoring case and surrounding whitespace, THEN THE Dashboard SHALL reject the new Task and SHALL not add the new Task to the task list.
2. WHEN a duplicate Task Name is submitted, THE Dashboard SHALL display a message stating that a duplicate task already exists.
3. WHEN a duplicate submission is rejected, THE Dashboard SHALL leave the existing task list unchanged.
4. FOR ALL existing Task Names N and any submitted Task Name S that equals N ignoring case and surrounding whitespace, THE Dashboard SHALL NOT create a new Task (duplicate-prevention invariant).

### Requirement 3: Complete Task

**User Story:** As a user, I want to mark a task as completed, so that I can track my progress.

#### Acceptance Criteria

1. WHEN the user toggles the completion control of a Task, THE Dashboard SHALL switch that Task's completion status between incomplete and complete.
2. WHILE a Task is marked complete, THE Dashboard SHALL visually distinguish the Task from incomplete Tasks.
3. WHEN a Task's completion status changes, THE Dashboard SHALL persist the updated status to Local Storage.

### Requirement 4: Delete Task

**User Story:** As a user, I want to delete a task, so that I can remove items I no longer need.

#### Acceptance Criteria

1. WHEN the user requests deletion of a Task, THE Dashboard SHALL remove the Task from the task list.
2. WHEN a Task is deleted, THE Dashboard SHALL persist the updated task list to Local Storage.
3. WHEN the last Task is deleted, THE Dashboard SHALL display an empty-state message in place of the task list.

### Requirement 5: Persist Tasks

**User Story:** As a user, I want my tasks to persist after I refresh the browser, so that I do not lose my task list.

#### Acceptance Criteria

1. WHEN the task list changes, THE Dashboard SHALL serialize the current task collection to Local Storage under a dedicated Storage Key.
2. WHEN the Dashboard loads, THE Dashboard SHALL deserialize the stored task collection from Local Storage and restore the task list.
3. WHEN no stored task collection exists in Local Storage, THE Dashboard SHALL initialize the task list as empty.
4. IF a stored task collection is corrupt or unreadable, THEN THE Dashboard SHALL reset the task list to empty without crashing the application.
5. FOR ALL valid task collections, serializing then deserializing then serializing SHALL produce an equivalent collection (persistence round-trip property).

### Requirement 6: Add Quick Link

**User Story:** As a user, I want to add a bookmark link, so that I can quickly access my favorite websites from the dashboard.

#### Acceptance Criteria

1. WHEN the user submits a non-empty title and a non-empty URL, THE Dashboard SHALL create a new Quick Link and display the Quick Link on the Dashboard.
2. WHEN the user submits a Quick Link with an empty or whitespace-only title, THE Dashboard SHALL reject the input and SHALL not create a Quick Link.
3. WHEN the user submits a Quick Link with an empty or whitespace-only URL, THE Dashboard SHALL reject the input and SHALL not create a Quick Link.
4. WHEN a submitted URL lacks a protocol scheme, THE Dashboard SHALL prepend a default protocol before storing the URL.

### Requirement 7: Edit Quick Link

**User Story:** As a user, I want to edit an existing quick link, so that I can correct or update its title or URL.

#### Acceptance Criteria

1. WHEN the user edits an existing Quick Link and saves changes, THE Dashboard SHALL update that Quick Link's title and URL in place.
2. WHEN an edited Quick Link title or URL is empty or whitespace-only, THE Dashboard SHALL reject the edit and SHALL leave the original Quick Link unchanged.
3. WHEN a Quick Link is updated, THE Dashboard SHALL persist the change to Local Storage.

### Requirement 8: Remove Quick Link

**User Story:** As a user, I want to remove a quick link, so that I can keep my shortcuts relevant.

#### Acceptance Criteria

1. WHEN the user requests removal of a Quick Link, THE Dashboard SHALL remove the Quick Link from the Dashboard.
2. WHEN a Quick Link is removed, THE Dashboard SHALL persist the updated Quick Link collection to Local Storage.
3. WHEN the last Quick Link is removed, THE Dashboard SHALL display an empty-state in place of the Quick Link area.

### Requirement 9: Persist Quick Links

**User Story:** As a user, I want my quick links to persist after I refresh the browser, so that I do not lose my bookmarks.

#### Acceptance Criteria

1. WHEN the Quick Link collection changes, THE Dashboard SHALL serialize the current collection to Local Storage under a dedicated Storage Key.
2. WHEN the Dashboard loads, THE Dashboard SHALL deserialize the stored Quick Link collection from Local Storage and restore the Quick Links.
3. WHEN no stored Quick Link collection exists in Local Storage, THE Dashboard SHALL initialize the Quick Link collection as empty.
4. IF a stored Quick Link collection is corrupt or unreadable, THEN THE Dashboard SHALL reset the Quick Link collection to empty without crashing the application.
5. FOR ALL valid Quick Link collections, serializing then deserializing then serializing SHALL produce an equivalent collection (persistence round-trip property).

### Requirement 10: Greeting with Custom Name

**User Story:** As a user, I want the dashboard to greet me by name, so that the experience feels personalized.

#### Acceptance Criteria

1. WHEN the User_Name is set, THE Dashboard SHALL display the User_Name within the Greeting.
2. WHEN the User_Name is not set, THE Dashboard SHALL display a default Greeting that does not reference a specific name.
3. WHEN the user submits a new User_Name, THE Dashboard SHALL update the Greeting immediately and persist the User_Name to Local Storage.
4. WHEN the user clears the User_Name, THE Dashboard SHALL revert to the default Greeting and SHALL clear the stored User_Name from Local Storage.
5. THE Dashboard SHALL trim leading and trailing whitespace from a submitted User_Name before storing the User_Name.

### Requirement 11: Current Date and Time Display

**User Story:** As a user, I want to see the current date and time, so that I have a reference while planning my day.

#### Acceptance Criteria

1. WHILE the Dashboard is open, THE Dashboard SHALL display the current date and time.
2. THE Dashboard SHALL update the displayed date and time at least once per second.
3. WHEN the Dashboard loads, THE Dashboard SHALL display the current date and time immediately without waiting for the first update interval.

### Requirement 12: Light and Dark Mode Toggle

**User Story:** As a user, I want to switch between light and dark mode, so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN the user activates the theme toggle, THE Dashboard SHALL switch the Theme between Light Mode and Dark Mode.
2. WHILE the Theme is Dark Mode, THE Dashboard SHALL apply a dark color palette to all Dashboard elements.
3. WHILE the Theme is Light Mode, THE Dashboard SHALL apply a light color palette to all Dashboard elements.
4. WHEN the Theme changes, THE Dashboard SHALL persist the current Theme to Local Storage.

### Requirement 13: Persist Theme Preference

**User Story:** As a user, I want my theme preference to persist after I refresh the browser, so that the dashboard remembers my choice.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL read the stored Theme from Local Storage and apply the stored Theme.
2. WHEN no stored Theme exists in Local Storage, THE Dashboard SHALL apply a default Theme of Light Mode.
3. IF a stored Theme value is neither Light Mode nor Dark Mode, THEN THE Dashboard SHALL fall back to Light Mode without crashing.
4. FOR ALL valid Theme values, serializing then deserializing then serializing SHALL produce an equivalent Theme value (persistence round-trip property).

### Requirement 14: Responsive Layout

**User Story:** As a user, I want the dashboard to be usable on desktop, tablet, and mobile, so that I can access the dashboard from any device.

#### Acceptance Criteria

1. WHILE the viewport width is at least 1024 pixels, THE Dashboard SHALL render a multi-column desktop layout.
2. WHILE the viewport width is between 768 and 1023 pixels inclusive, THE Dashboard SHALL render a tablet-optimized layout.
3. WHILE the viewport width is less than 768 pixels, THE Dashboard SHALL render a single-column mobile layout.
4. THE Dashboard SHALL keep all interactive controls usable and readable at every supported viewport width.

### Requirement 15: No-Build Operation

**User Story:** As a user, I want to open the dashboard by double-clicking index.html, so that I do not need to install tools or run a build step.

#### Acceptance Criteria

1. WHEN the index.html file is opened directly in a web browser, THE Dashboard SHALL load and operate without requiring a build step, package manager, or server.
2. THE Dashboard SHALL load CSS and JavaScript only from local files (css/style.css and js/script.js) within the project directory.
3. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript without any JavaScript framework, external library, or backend service.
