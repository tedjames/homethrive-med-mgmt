Overview
Welcome to the technical assessment round! In this challenge, you'll build a small fullstack application that demonstrates your ability to design, implement, and structure a modern web application with a cloud-native backend.

The goal is to complete the core requirements within a limited time—we’re more interested in your approach, architecture, and code quality than perfection.  You should time box your efforts to 4-6 hours, and note any decisions you made on implementation or scope choices.

Project: Medication Management App
You will build a simple Medication Manager that allows a caregiver to:

Add a medication for a care recipient.

Define a schedule for when the medication should be taken.

View a list of upcoming medication doses.

Mark a medication as taken.

Business Requirements
Each medication must have at least one scheduled dose.

Medications cannot be removed, only marked as inactive.

Medication schedules must support both daily and weekly recurrence.

Technical Requirements
Backend
Develop a service using AWS Lambda, AWS API Gateway

Use TypeScript for development.

Data should be persisted, but you can choose the approach (include information in the readme if you want to explain your reasoning, DynamoDB, RDS)

Frontend
Build a React-based front end.

Display a list of medications with upcoming doses.

Allow caregivers to add new medications and view schedules.

Include a simple UI for marking doses as taken.

Additional Requirements (time permitting)
Error Handling: Provide descriptive error messages and appropriate HTTP status codes.

Testing: Implement unit tests for core business logic. Mock your DB implementation in tests where appropriate.

Evaluation Criteria
Code Structure & Readability: Is your code modular, maintainable, and clear?

API Design: Is the backend well-structured and easy to understand?

Data Handling: Are medications and schedules stored and retrieved correctly?

UI/UX: Does the frontend provide a smooth and intuitive user experience?

Executable:  Do you provide instructions with a simple way for a reviewer to run your app and test functionality?

Submission Guidelines
Commit the code to a public GitHub repository.

Include a README with setup instructions.

If you need to cut scope, justify what features you prioritized and what you cut

Steps to run tests if included

Bonus:  write up on design choice and trade-offs