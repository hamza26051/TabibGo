# TabibGo

> A mobile healthcare-access prototype for requesting timely medical help when care needs to come to the patient.

TabibGo began with a practical question: when a family needs a doctor at home, how can the request, the clinician’s response, and the follow-up stay clear for everyone involved? This repository is the answer in prototype form—a React Native app for patient, clinician, and admin workflows, designed around the Pakistani care context.

## What the experience covers

### For patients

- Request a doctor through a guided flow: symptoms, location, optional supporting image, then confirmation.
- Discover and follow an accepted clinician’s route with live location and ETA cues.
- Continue care through in-app messaging or a video consultation flow.
- Keep visit history, digital prescriptions, treatment details, and medication reminders in one place.

### For clinicians and administrators

- Support a credential-onboarding and review flow for clinicians.
- Let clinicians manage nearby requests, availability, visits, prescriptions, earnings, and ratings.
- Give administrators a place to review verification requests, active visits, support tickets, and system activity.

## How it is built

| Layer | Role in the project |
| --- | --- |
| React Native + Expo | Cross-platform patient and clinician experience |
| Firebase | Authentication, real-time data, notifications, and server-side services |
| React Navigation + Context API | Navigation, auth, language, theme, request, location, and notification state |
| Maps, Places, and Geolocation | Location-aware booking, routing, and tracking flows |
| WebRTC | Video-consultation capability |
| Cloudinary | Image and document upload handling |
| English + Urdu | Bilingual interface support alongside light/dark theming |

The app is organised around the actual service flow rather than a collection of disconnected screens: `screens/` and `components/` hold the experience, `context/` keeps the shared state coherent, `firebase/` owns service integration, `navigation/` defines the journeys, and `admin/` contains the operational side of the product.

## Getting started

    npm install
    npx expo start

Use an Android emulator, device, or Expo’s development flow as appropriate. Firebase, maps, notifications, and media services need their own project configuration before those connected features can run. Keep any credentials or service keys out of version control.

## Important scope

TabibGo is a product prototype—not a live emergency-dispatch service, medical device, or source of clinical diagnosis. A symptom helper, route estimate, appointment state, or clinician profile should never replace professional judgment or emergency care. In a medical emergency, contact the applicable local emergency service directly.

The same principle applies to privacy: health details, location, images, and identity documents are sensitive. A production release would need formal security review, informed consent, role-based access controls, retention rules, and local healthcare/privacy compliance before real patient use.

## Why this work matters

The interesting part here is not simply putting a booking form on a phone. It is the full handoff: a patient asks for help, a verified clinician evaluates the request, both people can coordinate safely, and the outcome is recorded with enough context to support follow-up. That is the product system this repository explores.
