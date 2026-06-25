# NextFlow — AI Workflow Builder[https://magica-assign.vercel.app/]

## Overview

**NextFlow** is a visual AI workflow builder built with **Next.js** that allows users to create automated AI pipelines using a drag-and-drop canvas.

Inspired by tools like **n8n** and **Make.com**, users can visually connect nodes to build workflows involving **input collection, image processing, AI inference, and response generation**.

---

## Features

### Authentication

* Sign Up / Sign In using **Clerk**
* Protected routes via middleware
* Dashboard access after login

### Dashboard

Users can:

* View all workflows
* Create new workflows
* Open existing workflows
* Rename workflows
* Delete workflows

---

## Workflow Canvas

Built using **React Flow** with support for:

* Drag, zoom, and pan
* Node connections with type validation
* Cycle detection to prevent circular flows
* Auto-save every **1.5 seconds**
* Undo / Redo (**Ctrl+Z / Ctrl+Y**)
* MiniMap and grid background

---

## Node Types

### Request Inputs

Workflow entry point supporting:

* **Text fields**
* **Image uploads** (via Transloadit)

Users can dynamically add or remove input fields.

### Crop Image

* Accepts image input
* Crops images using percentage coordinates
* Processed server-side using **Sharp**

### Gemini 3.1 Pro

AI processing node that:

* Accepts prompt + optional image
* Sends requests to **Google Gemini API**
* Returns AI-generated text response

Supports configurable model settings.

### Response

Displays final workflow output:

* Text
* Images

---

## Workflow Execution

Supports:

* **Full workflow run**
* **Single node execution**
* **Multi-node execution**

During execution, active nodes show visual indicators and outputs are displayed inline.

---

## Run History

History panel stores:

* Run status
* Execution scope
* Duration
* Node-wise output previews

Useful for debugging and analysis.

---

## Import / Export

* Export workflows as **JSON**
* Import saved workflow files

---

## Backend

* **PostgreSQL (Neon)**
* **Prisma v7**
* Models: Workflow, WorkflowRun, NodeRun
* REST APIs for CRUD and execution

---

## Current Limitations

### Gemini API Rate Limits

Gemini integration is fully implemented, but live demos may fail due to free-tier quota restrictions:

* 15 requests/minute
* 1M tokens/day

This is a quota limitation, not a code issue.

### Blob URL Limitation

Local browser blob URLs cannot be processed server-side.

To solve this, images are uploaded via **Transloadit**, which provides hosted URLs for workflow execution.

---

## Tech Stack

| Layer            | Technology        |
| ---------------- | ----------------- |
| Framework        | Next.js 16        |
| Auth             | Clerk             |
| Database         | Neon PostgreSQL   |
| ORM              | Prisma            |
| Canvas           | React Flow        |
| AI               | Google Gemini API |
| Image Processing | Sharp             |
| Uploads          | Transloadit       |
| State            | Zustand + Zundo   |
| Background Jobs  | Trigger.dev       |
| Deployment       | Vercel            |
