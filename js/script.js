/*
 * To-Do List Life Dashboard
 * Single-file Vanilla JavaScript application (no build step, no dependencies).
 *
 * Three-layer separation inside this one file:
 *   - TLD.Logic  : pure data-transformation functions (no DOM, no localStorage). Testable core.
 *   - TLD.Storage : thin adapter over window.localStorage.
 *   - TLD.UI      : renderer, event binder, and clock service.
 *
 * The app is loaded via file:// and requires zero external resources.
 */

/* global window */
(function (global) {
  "use strict";

  // Set up the global namespaces used by the dashboard and its test harness.
  global.TLD = global.TLD || { Logic: {}, Storage: {}, UI: {} };

  var Logic = global.TLD.Logic;

  // ---------------------------------------------------------------------------
  // Data shape (for clarity; runtime is plain JavaScript)
  //
  //   Task {
  //     id: string,          // unique within the current task collection
  //     name: string,        // stored trimmed — preserves original casing for display
  //     completed: boolean   // default false on creation
  //   }
  //
  // Uniqueness is decided on the trimmed, LOWERCASED form via normalizeTaskName.
  // ---------------------------------------------------------------------------

  /**
   * normalizeTaskName — the uniqueness key for tasks.
   * Returns the name trimmed of surrounding whitespace and lowercased.
   *
   * @param {string} name
   * @returns {string}
   */
  Logic.normalizeTaskName = function normalizeTaskName(name) {
    return String(name).trim().toLowerCase();
  };

  /**
   * isValidTaskName — true when the trimmed form is non-empty.
   *
   * @param {string} name
   * @returns {boolean}
   */
  Logic.isValidTaskName = function isValidTaskName(name) {
    return String(name).trim().length > 0;
  };

  /**
   * isDuplicateTask — true when any existing task matches the submitted name
   * ignoring case and surrounding whitespace.
   *
   * @param {Task[]} tasks
   * @param {string} name
   * @returns {boolean}
   */
  Logic.isDuplicateTask = function isDuplicateTask(tasks, name) {
    var key = Logic.normalizeTaskName(name);
    for (var i = 0; i < tasks.length; i++) {
      if (Logic.normalizeTaskName(tasks[i].name) === key) {
        return true;
      }
    }
    return false;
  };

  /**
   * generateTaskId — produces an identifier unique within the given collection.
   * Uses max existing numeric id + 1 as a base, then verifies (and, if needed,
   * increments until) the id is not already present, so rapid additions cannot
   * collide even with timestamp-only schemes.
   *
   * @param {Task[]} tasks
   * @returns {string}
   */
  Logic.generateTaskId = function generateTaskId(tasks) {
    var max = 0;
    for (var i = 0; i < tasks.length; i++) {
      var n = Number(tasks[i].id);
      if (!Number.isNaN(n) && n > max) {
        max = n;
      }
    }
    var id = max + 1;
    // Verify uniqueness against the collection; bump until free.
    var taken = {};
    for (var j = 0; j < tasks.length; j++) {
      taken[String(tasks[j].id)] = true;
    }
    while (taken[String(id)]) {
      id += 1;
    }
    return String(id);
  };

  /**
   * addTask — validates, duplicate-checks, and appends a new task.
   *
   * On empty/whitespace name or a duplicate (trimmed, case-insensitive), returns
   *   { ok: false, tasks: <original collection unchanged>, error: <message> }
   * and does NOT mutate the input array.
   *
   * On success, appends { id, name: name.trim(), completed: false } and returns
   *   { ok: true, tasks: <new collection> }.
   *
   * The stored name preserves the original casing (only trimming is applied);
   * casing is folded only for the duplicate comparison via normalizeTaskName.
   *
   * @param {Task[]} tasks
   * @param {string} name
   * @returns {{ ok: boolean, tasks: Task[], error?: string }}
   */
  Logic.addTask = function addTask(tasks, name) {
    // Reject empty or whitespace-only names; leave the collection unchanged.
    if (!Logic.isValidTaskName(name)) {
      return { ok: false, tasks: tasks, error: "Task name must not be empty." };
    }
    // Reject duplicates (trimmed, case-insensitive); leave the collection unchanged.
    if (Logic.isDuplicateTask(tasks, name)) {
      return { ok: false, tasks: tasks, error: "A task with that name already exists." };
    }
    var newTask = {
      id: Logic.generateTaskId(tasks),
      name: String(name).trim(),
      completed: false
    };
    // Return a new array; do not mutate the input.
    var next = tasks.slice();
    next.push(newTask);
    return { ok: true, tasks: next };
  };

  /**
   * toggleTaskComplete — returns a NEW collection with the matching task's
   * completed status flipped; every other task is unchanged. If the id is not
   * found, the collection is returned unchanged (still a new array, no mutation
   * of the input). Applying the toggle twice restores the original collection.
   *
   * @param {Task[]} tasks
   * @param {string} id
   * @returns {Task[]}
   */
  Logic.toggleTaskComplete = function toggleTaskComplete(tasks, id) {
    var result = [];
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (String(t.id) === String(id)) {
        result.push({ id: t.id, name: t.name, completed: !t.completed });
      } else {
        result.push(t);
      }
    }
    return result;
  };

  /**
   * deleteTask — returns a NEW collection excluding the matching task; every
   * other task is unchanged and the size decreases by exactly one. If the id is
   * not found, the collection is returned unchanged.
   *
   * @param {Task[]} tasks
   * @param {string} id
   * @returns {Task[]}
   */
  Logic.deleteTask = function deleteTask(tasks, id) {
    var result = [];
    for (var i = 0; i < tasks.length; i++) {
      if (String(tasks[i].id) !== String(id)) {
        result.push(tasks[i]);
      }
    }
    return result;
  };

  /**
   * sortTasks — returns a sorted copy without modifying the task collection.
   * "added" preserves insertion order; name modes are case-insensitive.
   */
  Logic.sortTasks = function sortTasks(tasks, mode) {
    var result = Array.isArray(tasks) ? tasks.slice() : [];
    var sortMode = String(mode || "added");

    if (sortMode === "name" || sortMode === "name-asc" || sortMode === "alphabetical") {
      result.sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name), undefined, {
          sensitivity: "base"
        });
      });
    } else if (sortMode === "name-desc") {
      result.sort(function (a, b) {
        return String(b.name).localeCompare(String(a.name), undefined, {
          sensitivity: "base"
        });
      });
    } else if (sortMode === "active-first" || sortMode === "incomplete-first") {
      result.sort(function (a, b) {
        return Number(Boolean(a.completed)) - Number(Boolean(b.completed));
      });
    } else if (sortMode === "completed-first") {
      result.sort(function (a, b) {
        return Number(Boolean(b.completed)) - Number(Boolean(a.completed));
      });
    }

    return result;
  };

  /**
   * serializeTasks — serializes the task collection to a JSON string in a
   * stable shape (the array as-is).
   *
   * @param {Task[]} tasks
   * @returns {string}
   */
  Logic.serializeTasks = function serializeTasks(tasks) {
    return JSON.stringify(tasks);
  };

  /**
   * deserializeTasks — parses and validates the shape of a serialized task
   * collection. Returns [] on missing, malformed, non-array, or invalid input
   * WITHOUT throwing. Each element must have a string id, a string name, and a
   * boolean completed; invalid elements are dropped.
   *
   * @param {string} json
   * @returns {Task[]}
   */
  Logic.deserializeTasks = function deserializeTasks(json) {
    if (json == null) {
      return [];
    }
    var parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      return [];
    }
    if (!Array.isArray(parsed)) {
      return [];
    }
    var result = [];
    for (var i = 0; i < parsed.length; i++) {
      var item = parsed[i];
      if (
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.completed === "boolean"
      ) {
        result.push({ id: item.id, name: item.name, completed: item.completed });
      }
    }
    return result;
  };

  // ===========================================================================
  // Logic (pure) — Quick Link
  //
  //   QuickLink {
  //     id: string,     // unique within the current quick link collection
  //     title: string,  // stored trimmed
  //     url: string     // stored trimmed; guaranteed to have a protocol scheme
  //                     // (http:// prepended when no scheme is present)
  //   }
  //
  // As with Task Logic, none of these functions touch the DOM or localStorage;
  // they are the property-testable core for Quick Links.
  // ===========================================================================

  /**
   * normalizeUrl — guarantees a protocol scheme. If the trimmed url does not
   * begin with a scheme matching ^[a-z][a-z0-9+.-]*:// (case-insensitive),
   * prepends "http://"; otherwise returns the trimmed url unchanged.
   *
   * Examples:
   *   "example.com"          -> "http://example.com"
   *   "https://example.com"   -> "https://example.com"
   *   "  https://example.com " -> "https://example.com"
   *
   * @param {string} url
   * @returns {string}
   */
  Logic.normalizeUrl = function normalizeUrl(url) {
    var trimmed = String(url).trim();
    // A scheme is a letter followed by letters/digits/'+'/'.'/'-', then "://".
    var hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
    return hasScheme ? trimmed : "http://" + trimmed;
  };

  /**
   * isValidQuickLink — true when both the title and url are non-empty after
   * trimming.
   *
   * @param {string} title
   * @param {string} url
   * @returns {boolean}
   */
  Logic.isValidQuickLink = function isValidQuickLink(title, url) {
    return String(title).trim().length > 0 && String(url).trim().length > 0;
  };

  /**
   * generateQuickLinkId — produces an identifier unique within the given
   * collection. Uses max existing numeric id + 1 as a base, then verifies (and,
   * if needed, increments until) the id is not already present, so rapid
   * additions cannot collide even with timestamp-only schemes.
   *
   * @param {QuickLink[]} links
   * @returns {string}
   */
  Logic.generateQuickLinkId = function generateQuickLinkId(links) {
    var max = 0;
    for (var i = 0; i < links.length; i++) {
      var n = Number(links[i].id);
      if (!Number.isNaN(n) && n > max) {
        max = n;
      }
    }
    var id = max + 1;
    // Verify uniqueness against the collection; bump until free.
    var taken = {};
    for (var j = 0; j < links.length; j++) {
      taken[String(links[j].id)] = true;
    }
    while (taken[String(id)]) {
      id += 1;
    }
    return String(id);
  };

  /**
   * addQuickLink — validates, normalizes the URL, and appends a new quick link.
   *
   * On an empty/whitespace title or url, returns
   *   { ok: false, links: <original collection unchanged>, error: <message> }
   * and does NOT mutate the input array.
   *
   * On success, appends { id, title: title.trim(), url: normalizeUrl(url) } and
   * returns { ok: true, links: <new collection> }.
   *
   * @param {QuickLink[]} links
   * @param {string} title
   * @param {string} url
   * @returns {{ ok: boolean, links: QuickLink[], error?: string }}
   */
  Logic.addQuickLink = function addQuickLink(links, title, url) {
    if (!Logic.isValidQuickLink(title, url)) {
      return {
        ok: false,
        links: links,
        error: "Quick link title and URL must not be empty."
      };
    }
    var newLink = {
      id: Logic.generateQuickLinkId(links),
      title: String(title).trim(),
      url: Logic.normalizeUrl(url)
    };
    // Return a new array; do not mutate the input.
    var next = links.slice();
    next.push(newLink);
    return { ok: true, links: next };
  };

  /**
   * editQuickLink — updates the matching link in place on valid input.
   *
   * On an empty/whitespace title or url, returns
   *   { ok: false, links: <original collection unchanged, including the link
   *                        being edited>, error: <message> } and does NOT mutate
   * the input array.
   *
   * If the id is not found, the original collection is returned unchanged with
   * { ok: false }.
   *
   * On success, returns a new array in which the matching link's title equals
   * title.trim(), its url equals normalizeUrl(url), and its id is preserved;
   * every other link is unchanged.
   *
   * @param {QuickLink[]} links
   * @param {string} id
   * @param {string} title
   * @param {string} url
   * @returns {{ ok: boolean, links: QuickLink[], error?: string }}
   */
  Logic.editQuickLink = function editQuickLink(links, id, title, url) {
    // Reject empty/whitespace title or url; leave the collection unchanged.
    if (!Logic.isValidQuickLink(title, url)) {
      return {
        ok: false,
        links: links,
        error: "Quick link title and URL must not be empty."
      };
    }
    var normalizedTitle = String(title).trim();
    var normalizedUrl = Logic.normalizeUrl(url);
    var result = [];
    var found = false;
    for (var i = 0; i < links.length; i++) {
      var l = links[i];
      if (String(l.id) === String(id)) {
        result.push({ id: l.id, title: normalizedTitle, url: normalizedUrl });
        found = true;
      } else {
        result.push(l);
      }
    }
    if (!found) {
      // id not present; leave the collection unchanged.
      return { ok: false, links: links, error: "Quick link not found." };
    }
    return { ok: true, links: result };
  };

  /**
   * removeQuickLink — returns a NEW collection excluding the matching link;
   * every other link is unchanged and the size decreases by exactly one. If the
   * id is not found, the collection is returned unchanged.
   *
   * @param {QuickLink[]} links
   * @param {string} id
   * @returns {QuickLink[]}
   */
  Logic.removeQuickLink = function removeQuickLink(links, id) {
    var result = [];
    for (var i = 0; i < links.length; i++) {
      if (String(links[i].id) !== String(id)) {
        result.push(links[i]);
      }
    }
    return result;
  };

  /**
   * serializeQuickLinks — serializes the quick link collection to a JSON string
   * in a stable shape (the array as-is).
   *
   * @param {QuickLink[]} links
   * @returns {string}
   */
  Logic.serializeQuickLinks = function serializeQuickLinks(links) {
    return JSON.stringify(links);
  };

  /**
   * deserializeQuickLinks — parses and validates the shape of a serialized
   * quick link collection. Returns [] on missing, malformed, non-array, or
   * invalid input WITHOUT throwing. Each element must have a string id, a string
   * title, and a string url; invalid elements are dropped.
   *
   * @param {string} json
   * @returns {QuickLink[]}
   */
  Logic.deserializeQuickLinks = function deserializeQuickLinks(json) {
    if (json == null) {
      return [];
    }
    var parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      return [];
    }
    if (!Array.isArray(parsed)) {
      return [];
    }
    var result = [];
    for (var i = 0; i < parsed.length; i++) {
      var item = parsed[i];
      if (
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.url === "string"
      ) {
        result.push({ id: item.id, title: item.title, url: item.url });
      }
    }
    return result;
  };

  // ===========================================================================
  // Logic (pure) — Greeting
  //
  //   UserName = string; // stored trimmed; empty string means "not set"
  //
  // These functions do not touch the DOM or localStorage; they are the
  // property-testable core for the Greeting surface.
  // ===========================================================================

  /**
   * normalizeUserName — returns the name trimmed of surrounding whitespace.
   * An empty result means the name is "not set".
   *
   * @param {string} name
   * @returns {string}
   */
  Logic.normalizeUserName = function normalizeUserName(name) {
    return String(name).trim();
  };

  /**
   * buildGreeting — returns a time-of-day greeting. When userName is
   * non-empty after trimming, the greeting includes the trimmed name
   * (e.g. "Good morning, <name>."); otherwise it returns a default greeting
   * that does NOT reference a name (e.g. "Good morning.").
   *
   * The time-of-day is derived from the `date` argument's hour when provided,
   * otherwise from the current time (new Date()). Hours:
   *   morning    hour < 12
   *   afternoon  12 <= hour < 18
   *   evening    hour >= 18
   *
   * This function is pure in the sense it touches no DOM or localStorage;
   * using new Date() as the default for the optional `date` argument is
   * acceptable.
   *
   * @param {string} userName
   * @param {Date} [date] optional Date whose hour selects the greeting
   * @returns {string}
   */
  Logic.buildGreeting = function buildGreeting(userName, date) {
    var now = date ? date : new Date();
    var hour = now.getHours();
    var part;
    if (hour < 12) {
      part = "Good morning";
    } else if (hour < 18) {
      part = "Good afternoon";
    } else {
      part = "Good evening";
    }
    var trimmed = Logic.normalizeUserName(userName);
    if (trimmed.length > 0) {
      return part + ", " + trimmed + ".";
    }
    return part + ".";
  };

  // ===========================================================================
  // Logic (pure) — Theme
  //
  //   Theme = "light" | "dark";
  //
  // These functions do not touch the DOM or localStorage; they are the
  // property-testable core for the Theme surface, including the persistence
  // round-trip and the corrupt/invalid fallback to "light".
  // ===========================================================================

  /**
   * isValidTheme — true when value is exactly "light" or "dark".
   *
   * @param {string} value
   * @returns {boolean}
   */
  Logic.isValidTheme = function isValidTheme(value) {
    return value === "light" || value === "dark";
  };

  /**
   * normalizeTheme — returns value when it is a valid theme, otherwise
   * returns "light" (the safe fallback).
   *
   * @param {string} value
   * @returns {"light" | "dark"}
   */
  Logic.normalizeTheme = function normalizeTheme(value) {
    return Logic.isValidTheme(value) ? value : "light";
  };

  /**
   * toggleTheme — flips between "light" and "dark". Applying it twice restores
   * the original theme.
   *
   * @param {"light" | "dark"} theme
   * @returns {"light" | "dark"}
   */
  Logic.toggleTheme = function toggleTheme(theme) {
    return theme === "light" ? "dark" : "light";
  };

  /**
   * serializeTheme — serializes a theme value to a JSON string
   * (e.g. JSON.stringify("light") -> "\"light\"").
   *
   * @param {string} theme
   * @returns {string}
   */
  Logic.serializeTheme = function serializeTheme(theme) {
    return JSON.stringify(theme);
  };

  /**
   * deserializeTheme — parses a serialized theme JSON string. Falls back to
   * "light" on missing (null), malformed JSON, or a value that is not "light"
   * or "dark" — WITHOUT throwing. Always returns a valid theme.
   *
   * @param {string} json
   * @returns {"light" | "dark"}
   */
  Logic.deserializeTheme = function deserializeTheme(json) {
    if (json == null) {
      return "light";
    }
    var parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      return "light";
    }
    // parsed may be null, a non-string, or a string that is not a valid theme;
    // normalizeTheme handles all of these and falls back to "light".
    return Logic.normalizeTheme(parsed);
  };

  // ===========================================================================
  // TLD.Storage — thin adapter over window.localStorage
  //
  // Side-effectful: every read/write goes through window.localStorage. Reads
  // are made safe: getJSON NEVER throws — on a missing key, malformed JSON, or
  // any thrown error it returns the caller-supplied fallback, so a corrupt
  // value under one key never crashes the app and never affects other keys
  // (each key is read and written independently).
  //
  // Storage keys used by the app (see design "Local Storage Key Strategy"):
  //   tld.tasks       JSON array of Task          default []
  //   tld.quickLinks  JSON array of QuickLink     default []
  //   tld.theme        JSON string "light"|"dark"  default "light"
  //   tld.userName     JSON string (trimmed)       default ""
  //
  // These functions guard against window.localStorage being unavailable or
  // throwing on access (e.g. SecurityError when storage is disabled, or
  // QuotaExceededError on write): get returns null, getJSON returns its
  // fallback, and set/remove silently no-op, so the dashboard degrades
  // gracefully instead of crashing.
  // ===========================================================================

  var Storage = global.TLD.Storage;

  /**
   * Storage.get — returns the raw string stored under `key`, or `null` when
   * the key is missing, localStorage is unavailable, or access throws.
   *
   * @param {string} key
   * @returns {string | null}
   */
  Storage.get = function get(key) {
    try {
      var ls = global.localStorage;
      if (!ls) {
        return null;
      }
      return ls.getItem(key);
    } catch (e) {
      return null;
    }
  };

  /**
   * Storage.set — stores the raw string `value` under `key`. Silently no-ops
   * when localStorage is unavailable or the write throws (e.g. quota exceeded).
   *
   * @param {string} key
   * @param {string} value
   * @returns {void}
   */
  Storage.set = function set(key, value) {
    try {
      var ls = global.localStorage;
      if (!ls) {
        return;
      }
      ls.setItem(key, value);
    } catch (e) {
      // Swallow quota/access errors so a failed write never crashes the app.
    }
  };

  /**
   * Storage.remove — deletes the entry under `key`. Silently no-ops when
   * localStorage is unavailable or the removal throws.
   *
   * @param {string} key
   * @returns {void}
   */
  Storage.remove = function remove(key) {
    try {
      var ls = global.localStorage;
      if (!ls) {
        return;
      }
      ls.removeItem(key);
    } catch (e) {
      // Swallow access errors so a failed removal never crashes the app.
    }
  };

  /**
   * Storage.getJSON — reads and JSON.parses the value under `key`.
   *
   * Returns `fallback` when:
   *   - the key is missing (raw === null)
   *   - localStorage is unavailable
   *   - JSON.parse throws (malformed JSON)
   *   - the parsed value is null or undefined (e.g. the stored string was
   *     "null"); a parsed null is treated as "not set" and falls back so the
   *     callers — which expect arrays or a theme string — always receive a
   *     usable default.
   *
   * This function NEVER throws. Shape validation (is the value an array? are
   * the elements well-formed?) is the Logic layer's responsibility via
   * Logic.deserializeTasks / deserializeQuickLinks / deserializeTheme, which
   * also never throw and reset to empty/default on invalid input.
   *
   * @param {string} key
   * @param {T} fallback
   * @returns {T}
   */
  Storage.getJSON = function getJSON(key, fallback) {
    var raw = Storage.get(key);
    if (raw === null) {
      return fallback;
    }
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
    // A parsed null/undefined means "no usable value" — fall back to the
    // caller's default rather than propagating null into renderers.
    if (parsed === null || parsed === undefined) {
      return fallback;
    }
    return parsed;
  };

  /**
   * Storage.setJSON — JSON.stringifies `value` and stores it under `key`.
   * Silently no-ops when localStorage is unavailable, the value cannot be
   * stringified, or the write throws. The app only ever stores plain JSON
   * data (tasks, quick links, theme, user name), so the unstringifiable path
   * should not occur in practice but is guarded for safety.
   *
   * @param {string} key
   * @param {unknown} value
   * @returns {void}
   */
  Storage.setJSON = function setJSON(key, value) {
    var stringified;
    try {
      stringified = JSON.stringify(value);
    } catch (e) {
      return;
    }
    Storage.set(key, stringified);
  };

  // ===========================================================================
  // TLD.UI — renderers, clock, and event handlers
  // ===========================================================================

  var UI = global.TLD.UI;
  var FOCUS_TIMER_DURATION = 25 * 60;
  var KEYS = {
    tasks: "tld.tasks",
    quickLinks: "tld.quickLinks",
    theme: "tld.theme",
    userName: "tld.userName",
    focusDuration: "tld.focusDuration"
  };
  var state = {
    tasks: [],
    quickLinks: [],
    theme: "light",
    userName: ""
  };
  var eventsBound = false;
  var appInitialized = false;
  var clockInterval = null;
  var focusTimerInterval = null;
  var focusTimerDeadline = null;
  var focusTimerRemaining = FOCUS_TIMER_DURATION;
  var focusTimerRunning = false;
  var focusTimerHasStarted = false;
  var focusTimerDuration = FOCUS_TIMER_DURATION;
  var taskSortMode = "added";

  function getElement(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function setEmptyState(listId, emptyId, isEmpty) {
    var list = getElement(listId);
    var empty = getElement(emptyId);
    if (list) {
      list.hidden = isEmpty;
    }
    if (empty) {
      empty.hidden = !isEmpty;
    }
  }

  function persistTasks() {
    Storage.setJSON(KEYS.tasks, state.tasks);
  }

  function persistQuickLinks() {
    Storage.setJSON(KEYS.quickLinks, state.quickLinks);
  }

  function getActionButton(target, list) {
    if (!target || !list || typeof target.closest !== "function") {
      return null;
    }
    var button = target.closest("[data-action]");
    return button && list.contains(button) ? button : null;
  }

  UI.renderTaskList = function renderTaskList(tasks) {
    var list = getElement("task-list");
    if (!list) {
      return;
    }
    tasks = Logic.sortTasks(tasks, taskSortMode);
    list.textContent = "";
    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];
      var item = global.document.createElement("li");
      item.className = "task-item" + (task.completed ? " task-completed" : "");

      var checkbox = global.document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-toggle";
      checkbox.checked = Boolean(task.completed);
      checkbox.dataset.action = "toggle-task";
      checkbox.dataset.taskId = String(task.id);
      checkbox.setAttribute(
        "aria-label",
        (task.completed ? "Mark incomplete: " : "Mark complete: ") + task.name
      );

      var label = global.document.createElement("span");
      label.className = "task-label";
      label.textContent = task.name;

      var remove = global.document.createElement("button");
      remove.type = "button";
      remove.className = "btn-delete";
      remove.dataset.action = "delete-task";
      remove.dataset.taskId = String(task.id);
      remove.textContent = "Delete";
      remove.setAttribute("aria-label", "Delete task: " + task.name);

      item.appendChild(checkbox);
      item.appendChild(label);
      item.appendChild(remove);
      list.appendChild(item);
    }
    setEmptyState("task-list", "task-empty-state", tasks.length === 0);
  };

  UI.renderQuickLinks = function renderQuickLinks(links) {
    var list = getElement("quick-link-list");
    if (!list) {
      return;
    }
    list.textContent = "";
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var item = global.document.createElement("li");
      item.className = "quick-link-item";

      var anchor = global.document.createElement("a");
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = link.title;

      var edit = global.document.createElement("button");
      edit.type = "button";
      edit.className = "btn-edit";
      edit.dataset.action = "edit-quick-link";
      edit.dataset.linkId = String(link.id);
      edit.textContent = "Edit";
      edit.setAttribute("aria-label", "Edit quick link: " + link.title);

      var remove = global.document.createElement("button");
      remove.type = "button";
      remove.className = "btn-remove";
      remove.dataset.action = "remove-quick-link";
      remove.dataset.linkId = String(link.id);
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove quick link: " + link.title);

      item.appendChild(anchor);
      item.appendChild(edit);
      item.appendChild(remove);
      list.appendChild(item);
    }
    setEmptyState("quick-link-list", "quick-link-empty-state", links.length === 0);
  };

  UI.renderGreeting = function renderGreeting(userName, date) {
    var greeting = getElement("greeting");
    if (greeting) {
      greeting.textContent = Logic.buildGreeting(userName, date);
    }
  };

  UI.renderClock = function renderClock(date) {
    var clock = getElement("clock");
    if (clock) {
      clock.textContent = (date || new Date()).toLocaleString();
    }
  };

  UI.startClock = function startClock() {
    UI.renderClock();
    if (clockInterval !== null) {
      global.clearInterval(clockInterval);
    }
    clockInterval = global.setInterval(function () {
      UI.renderClock();
    }, 1000);
    return clockInterval;
  };

  UI.stopClock = function stopClock() {
    if (clockInterval !== null) {
      global.clearInterval(clockInterval);
      clockInterval = null;
    }
  };

  UI.renderFocusTimer = function renderFocusTimer() {
    var display = getElement("focus-timer-display");
    if (display) {
      var minutes = Math.floor(focusTimerRemaining / 60);
      var seconds = focusTimerRemaining % 60;
      display.textContent =
        (minutes < 10 ? "0" : "") + minutes + ":" +
        (seconds < 10 ? "0" : "") + seconds;
    }

    var status = getElement("focus-timer-status");
    if (status) {
      if (focusTimerRunning) {
        status.textContent = "Focus session in progress.";
      } else if (focusTimerRemaining === 0) {
        status.textContent = "Focus session complete!";
      } else if (focusTimerHasStarted) {
        status.textContent = "Timer paused.";
      } else {
        status.textContent = "Ready to focus.";
      }
    }

    var startButton = getElement("start-timer");
    if (startButton) {
      startButton.disabled = focusTimerRunning || focusTimerRemaining === 0;
    }
    var stopButton = getElement("stop-timer");
    if (stopButton) {
      stopButton.disabled = !focusTimerRunning;
    }
  };

  function tickFocusTimer() {
    if (!focusTimerRunning || focusTimerDeadline === null) {
      return;
    }
    focusTimerRemaining = Math.max(
      0,
      Math.ceil((focusTimerDeadline - Date.now()) / 1000)
    );
    if (focusTimerRemaining === 0) {
      global.clearInterval(focusTimerInterval);
      focusTimerInterval = null;
      focusTimerDeadline = null;
      focusTimerRunning = false;
    }
    UI.renderFocusTimer();
  }

  UI.startFocusTimer = function startFocusTimer() {
    if (focusTimerRunning || focusTimerRemaining === 0) {
      return;
    }
    focusTimerDeadline = Date.now() + focusTimerRemaining * 1000;
    focusTimerRunning = true;
    focusTimerHasStarted = true;
    UI.renderFocusTimer();
    focusTimerInterval = global.setInterval(tickFocusTimer, 1000);
  };

  UI.stopFocusTimer = function stopFocusTimer() {
    if (!focusTimerRunning) {
      return;
    }
    tickFocusTimer();
    if (focusTimerRunning) {
      global.clearInterval(focusTimerInterval);
      focusTimerInterval = null;
      focusTimerDeadline = null;
      focusTimerRunning = false;
      UI.renderFocusTimer();
    }
  };

  UI.resetFocusTimer = function resetFocusTimer() {
    if (focusTimerInterval !== null) {
      global.clearInterval(focusTimerInterval);
      focusTimerInterval = null;
    }
    focusTimerDeadline = null;
    focusTimerRemaining = focusTimerDuration;
    focusTimerRunning = false;
    focusTimerHasStarted = false;
    UI.renderFocusTimer();
  };

  UI.setFocusDuration = function setFocusDuration(minutes) {
    var numericMinutes = Number(minutes);
    if (!Number.isFinite(numericMinutes) || !Number.isInteger(numericMinutes)) {
      return false;
    }
    if (numericMinutes < 1 || numericMinutes > 180) {
      return false;
    }

    if (focusTimerInterval !== null) {
      global.clearInterval(focusTimerInterval);
      focusTimerInterval = null;
    }
    focusTimerDeadline = null;
    focusTimerRunning = false;
    focusTimerHasStarted = false;
    focusTimerDuration = numericMinutes * 60;
    focusTimerRemaining = focusTimerDuration;
    Storage.setJSON(KEYS.focusDuration, numericMinutes);
    var input = getElement("pomodoro-minutes");
    if (input) {
      input.value = String(numericMinutes);
    }
    UI.renderFocusTimer();
    return true;
  };

  UI.applyTheme = function applyTheme(theme) {
    state.theme = Logic.normalizeTheme(theme);
    if (!global.document) {
      return;
    }
    global.document.documentElement.setAttribute("data-theme", state.theme);
    var button = getElement("theme-toggle");
    if (button) {
      var nextTheme = state.theme === "dark" ? "light" : "dark";
      button.textContent = nextTheme === "dark" ? "Dark mode" : "Light mode";
      button.setAttribute("aria-pressed", String(state.theme === "dark"));
      button.setAttribute(
        "aria-label",
        "Switch to " + nextTheme + " theme"
      );
      button.title = "Switch to " + nextTheme + " theme";
    }
  };

  UI.showDuplicateMessage = function showDuplicateMessage(message) {
    var element = getElement("duplicate-message");
    if (element) {
      element.textContent = message || "A task with that name already exists.";
      element.hidden = false;
    }
  };

  UI.clearDuplicateMessage = function clearDuplicateMessage() {
    var element = getElement("duplicate-message");
    if (element) {
      element.textContent = "";
      element.hidden = true;
    }
  };

  UI.clearTaskInput = function clearTaskInput() {
    var input = getElement("task-input");
    if (input) {
      input.value = "";
      input.focus();
    }
  };

  UI.bindEvents = function bindEvents() {
    if (eventsBound || !global.document) {
      return;
    }
    eventsBound = true;

    var taskForm = getElement("task-form");
    if (taskForm) {
      taskForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = getElement("task-input");
        var result = Logic.addTask(state.tasks, input ? input.value : "");
        if (!result.ok) {
          if (result.error && result.error.indexOf("already exists") !== -1) {
            UI.showDuplicateMessage(result.error);
          }
          return;
        }
        state.tasks = result.tasks;
        persistTasks();
        UI.renderTaskList(state.tasks);
        UI.clearDuplicateMessage();
        UI.clearTaskInput();
      });
    }

    var taskList = getElement("task-list");
    if (taskList) {
      taskList.addEventListener("change", function (event) {
        var action = getActionButton(event.target, taskList);
        if (!action || action.dataset.action !== "toggle-task") {
          return;
        }
        state.tasks = Logic.toggleTaskComplete(
          state.tasks,
          action.dataset.taskId
        );
        persistTasks();
        UI.renderTaskList(state.tasks);
      });
      taskList.addEventListener("click", function (event) {
        var action = getActionButton(event.target, taskList);
        if (!action || action.dataset.action !== "delete-task") {
          return;
        }
        state.tasks = Logic.deleteTask(state.tasks, action.dataset.taskId);
        persistTasks();
        UI.renderTaskList(state.tasks);
      });
    }

    var taskSort = getElement("task-sort");
    if (taskSort) {
      taskSort.addEventListener("change", function () {
        taskSortMode = taskSort.value;
        UI.renderTaskList(state.tasks);
      });
    }

    var taskInput = getElement("task-input");
    if (taskInput) {
      taskInput.addEventListener("input", UI.clearDuplicateMessage);
    }

    var quickLinkForm = getElement("quick-link-form");
    if (quickLinkForm) {
      quickLinkForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var title = getElement("quick-link-title");
        var url = getElement("quick-link-url");
        var result = Logic.addQuickLink(
          state.quickLinks,
          title ? title.value : "",
          url ? url.value : ""
        );
        if (!result.ok) {
          if (title && !Logic.isValidQuickLink(title.value, "valid")) {
            title.focus();
          } else if (url) {
            url.focus();
          }
          return;
        }
        state.quickLinks = result.links;
        persistQuickLinks();
        UI.renderQuickLinks(state.quickLinks);
        quickLinkForm.reset();
      });
    }

    var quickLinkList = getElement("quick-link-list");
    if (quickLinkList) {
      quickLinkList.addEventListener("click", function (event) {
        var action = getActionButton(event.target, quickLinkList);
        if (!action) {
          return;
        }
        var linkId = action.dataset.linkId;
        if (action.dataset.action === "remove-quick-link") {
          state.quickLinks = Logic.removeQuickLink(state.quickLinks, linkId);
          persistQuickLinks();
          UI.renderQuickLinks(state.quickLinks);
          return;
        }
        if (action.dataset.action !== "edit-quick-link") {
          return;
        }
        var current = null;
        for (var i = 0; i < state.quickLinks.length; i++) {
          if (String(state.quickLinks[i].id) === String(linkId)) {
            current = state.quickLinks[i];
            break;
          }
        }
        if (!current) {
          return;
        }
        var title = global.prompt("Quick link title:", current.title);
        if (title === null) {
          return;
        }
        var url = global.prompt("Quick link URL:", current.url);
        if (url === null) {
          return;
        }
        var result = Logic.editQuickLink(
          state.quickLinks,
          linkId,
          title,
          url
        );
        if (!result.ok) {
          global.alert(result.error);
          return;
        }
        state.quickLinks = result.links;
        persistQuickLinks();
        UI.renderQuickLinks(state.quickLinks);
      });
    }

    var userNameForm = getElement("user-name-form");
    if (userNameForm) {
      userNameForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = getElement("user-name-input");
        state.userName = Logic.normalizeUserName(input ? input.value : "");
        if (state.userName) {
          Storage.setJSON(KEYS.userName, state.userName);
        } else {
          Storage.remove(KEYS.userName);
        }
        UI.renderGreeting(state.userName);
      });
    }

    var clearName = getElement("user-name-clear");
    if (clearName) {
      clearName.addEventListener("click", function () {
        state.userName = "";
        Storage.remove(KEYS.userName);
        var input = getElement("user-name-input");
        if (input) {
          input.value = "";
        }
        UI.renderGreeting(state.userName);
      });
    }

    var themeToggle = getElement("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", function () {
        state.theme = Logic.toggleTheme(state.theme);
        Storage.setJSON(KEYS.theme, state.theme);
        UI.applyTheme(state.theme);
      });
    }

    var startTimer = getElement("start-timer");
    if (startTimer) {
      startTimer.addEventListener("click", UI.startFocusTimer);
    }
    var stopTimer = getElement("stop-timer");
    if (stopTimer) {
      stopTimer.addEventListener("click", UI.stopFocusTimer);
    }
    var resetTimer = getElement("reset-timer");
    if (resetTimer) {
      resetTimer.addEventListener("click", UI.resetFocusTimer);
    }

    var pomodoroForm = getElement("pomodoro-time-form");
    if (pomodoroForm) {
      pomodoroForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = getElement("pomodoro-minutes");
        if (!UI.setFocusDuration(input ? input.value : "")) {
          if (input) {
            input.setCustomValidity("Enter a duration between 1 and 180 minutes.");
            input.reportValidity();
            input.setCustomValidity("");
            input.focus();
          }
        }
      });
    }
  };

  // ===========================================================================
  // App bootstrap
  // ===========================================================================

  var AppInit = {
    init: function init() {
      if (appInitialized || !global.document || !getElement("task-form")) {
        return;
      }
      appInitialized = true;

      var storedTasks = Storage.getJSON(KEYS.tasks, []);
      state.tasks = Logic.deserializeTasks(
        JSON.stringify(Array.isArray(storedTasks) ? storedTasks : [])
      );

      var storedLinks = Storage.getJSON(KEYS.quickLinks, []);
      state.quickLinks = Logic.deserializeQuickLinks(
        JSON.stringify(Array.isArray(storedLinks) ? storedLinks : [])
      );

      state.theme = Logic.normalizeTheme(Storage.getJSON(KEYS.theme, "light"));
      var storedName = Storage.getJSON(KEYS.userName, "");
      state.userName =
        typeof storedName === "string"
          ? Logic.normalizeUserName(storedName)
          : "";

      var storedFocusMinutes = Storage.getJSON(KEYS.focusDuration, 25);
      var focusMinutes = Number(storedFocusMinutes);
      if (Number.isFinite(focusMinutes)) {
        focusMinutes = Math.round(focusMinutes);
        if (focusMinutes >= 1 && focusMinutes <= 180) {
          focusTimerDuration = focusMinutes * 60;
          focusTimerRemaining = focusTimerDuration;
          var pomodoroInput = getElement("pomodoro-minutes");
          if (pomodoroInput) {
            pomodoroInput.value = String(focusMinutes);
          }
        }
      }

      UI.applyTheme(state.theme);
      UI.renderTaskList(state.tasks);
      UI.renderQuickLinks(state.quickLinks);
      UI.renderGreeting(state.userName);
      UI.startClock();
      UI.renderFocusTimer();
      UI.bindEvents();
    }
  };

  global.TLD.AppInit = AppInit;

  if (global.document) {
    if (global.document.readyState === "loading") {
      global.document.addEventListener("DOMContentLoaded", AppInit.init);
    } else {
      AppInit.init();
    }
  }
})(typeof window !== "undefined" ? window : this);
