# RailTrail

A full-stack application to track vehicles on rail lines.
Currently applied on the [Malente-Lütjenbug railway track](https://www.schiene-m-l.de/) as part of the [REAKT DATA reseach project](https://reakt.sh/).

<img width="600" alt="railtrail" src="https://github.com/user-attachments/assets/f0abc915-698f-47d3-8c98-0b1b1b75c6ed" />

There is also a [mobile app](https://github.com/reakt-sh/railtrail-app) as a travel companion for railbikes rented on the Malente-Lütjenburg railway track. It uses this application as a backend for position tracking.

## Repository Structure

This is a monorepo containing both frontend and backend (split in two separate services), as well as shared schema definitions and development scripts.

- **[positioning-backend](./backend/positioning)** The Python backend service for receiving, processing, and storing vehicle position data.
- **[website-backend](./backend/website)** A Node Express server distributing the web frontend and providing endpoints for frontend interactions.
- **[frontend](./frontend)** The Angular web application for visualizing live positions of rail vehicles and managing vehicles information and tracking data.
- **[database](./database)** Database schema using Prisma ORM.
- **[raillines](./raillines)** Data and configurations for the rail lines.
- **[schema](./schema)** Shared JSON schema definitions for all types of messages exchanged between frontend and backend.
- **[dev](./dev)** Development scripts for initializing and updating the project.

## Developer Setup

This project provides a Python program to initialize the sub-projects and update shared resources.
Run `python dev/dev.py init` to initialize the development environment. For further capabilities check `python dev/dev.py --help`.
