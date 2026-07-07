# NextFlow — AI Workflow Builder

🌐 **Live Demo:** https://magica-assign.vercel.app

🎥 **Demo Video:** https://drive.google.com/file/d/1t0TWinavFWKZbxrnSe3RMxNVe95E4J1Q/view?usp=sharing

> **Note:** The demo video is hosted on Google Drive because it exceeds GitHub's 25 MB upload limit. There are a few places where the audio volume is slightly lower due to a system recording issue.

---

# Overview

**NextFlow** is a visual AI workflow builder built with **Next.js** that enables users to create automated AI pipelines using a drag-and-drop interface.

Inspired by platforms like **n8n** and **Make.com**, users can visually connect workflow nodes to build pipelines involving user inputs, image processing, AI inference, and response generation.

---

# Features

## Authentication

* Clerk Authentication
* Protected Routes
* Secure Sign Up / Sign In
* Automatic Dashboard Redirect after login

---

## Dashboard

Users can:

* View all workflows
* Create new workflows
* Open existing workflows
* Rename workflows
* Delete workflows
* **Load Sample Workflow** (pre-built workflow matching the assignment specification)

---

## Workflow Canvas

Built using **React Flow** with support for:

* Drag, Zoom & Pan
* Type-safe node connections
* Cycle detection
* Auto-save every 1.5 seconds
* Undo / Redo (Ctrl + Z / Ctrl + Y)
* MiniMap
* Grid Background

---

# Supported Nodes

## Request Inputs

Supports:

* Text Fields
* Image Uploads (Transloadit)

Users can dynamically add or remove input fields.

---

## Crop Image

* Accepts image input
* Crops using percentage coordinates
* Processed server-side using Sharp
* Dynamic parameter handles for X, Y, Width and Height

---

## Gemini AI Node

* Uses Google Gemini API
* Accepts prompt + optional image
* Supports multimodal generation
* Configurable model settings
* Returns AI-generated text

---

## Response Node

Displays:

* Generated text
* Images

---

# Workflow Execution

Supports:

* Full Workflow Execution
* Single Node Execution
* Multi-Node / Selective Execution

During execution:

* Running nodes display visual animations
* Outputs appear directly inside nodes
* DAG-based execution ensures dependent nodes execute only after required inputs become available

---

# Run History

Every execution is stored.

History includes:

* Status
* Execution Scope
* Duration
* Node-wise Outputs

Useful for debugging and reviewing previous runs.

---

# Import / Export

* Export workflows as JSON
* Import workflows from JSON

Allows workflows to be shared and backed up.

---

# Backend

* Neon PostgreSQL
* Prisma v7
* Workflow
* WorkflowRun
* NodeRun

REST APIs handle workflow CRUD operations and execution.

---

# Recent Improvements

The following feedback has been addressed in the latest version:

### ✅ Sample Workflow Added

A **Load Sample Workflow** button has been added to the dashboard.

It automatically creates the complete workflow described in the assignment with all nodes and connections already configured.

---

### ✅ Gemini Integration Updated

The Gemini node has been updated to use **Gemini 2.5 Flash**.

The previous demo occasionally failed because the **Google Gemini Free Tier** enforces strict rate limits (15 requests/minute). This was a quota limitation rather than an implementation issue.

The integration itself is fully implemented and functional.

---

### ✅ Crop Image Handles Improved

Each Crop Image parameter now includes a clearly visible colored connection handle for:

* X Position
* Y Position
* Width
* Height

making dynamic connections much easier to understand.

---

### ✅ Single Node & Selective Execution Demonstrated

Each workflow node includes its own **Run** button for executing individual nodes.

Users can also:

* Shift-select multiple nodes
* Execute only selected nodes

This enables faster debugging without running the complete workflow.

---

# Current Limitations

## Gemini API Rate Limits

Google Gemini Free Tier limits:

* 15 Requests / Minute
* 1 Million Tokens / Day

If these limits are exceeded, requests may fail.

This is a Google API quota limitation and **not a code issue**.

---

## Blob URL Limitation

Browser blob URLs cannot be accessed by the server.

To solve this, uploaded images are first sent to **Transloadit**, which provides publicly accessible HTTPS URLs used during workflow execution.

---

# Tech Stack

| Layer            | Technology              |
| ---------------- | ----------------------- |
| Framework        | Next.js 16 (App Router) |
| Authentication   | Clerk                   |
| Database         | Neon PostgreSQL         |
| ORM              | Prisma v7               |
| Canvas           | React Flow              |
| AI               | Google Gemini 2.5 Flash |
| Image Processing | Sharp                   |
| Image Upload     | Transloadit             |
| State Management | Zustand + Zundo         |
| Background Jobs  | Trigger.dev             |
| Deployment       | Vercel                  |

---

# Project Links

* **Live Application:** https://magica-assign.vercel.app
* **GitHub Repository:** https://github.com/Rutwik8257/magicaAssign
* **Demo Video:** https://drive.google.com/file/d/1t0TWinavFWKZbxrnSe3RMxNVe95E4J1Q/view?usp=sharing
