# MUCUS Mobile App - Complete Context & Architecture Overview

## What This App Does

**MUCUS** (Mobile Urgent Care Service) is a comprehensive telemedicine and home-visit healthcare platform designed specifically for the Pakistani market. It connects patients with certified doctors for urgent medical care, providing real-time location tracking, video consultations, prescription management, and emergency services integration.

---

## 🏥 Core Features & Functionality

### **Patient Features**

#### **1. AI-Powered Health Assistant**
- **Symptom Analysis**: Advanced AI chatbot with 50+ disease database
- **Local Medicine Recommendations**: Pakistani medicine names (Panadol, Brufen, Arinac Forte, etc.)
- **Disease Matching**: Automatic symptom-to-disease matching with treatment suggestions
- **Health Insights**: Smart analysis of visit history and symptoms

#### **2. Doctor Booking & Tracking**
- **Multi-step Booking**: Symptom selection → Location → Image upload → Confirmation
- **Real-time Doctor Matching**: Location-based doctor discovery
- **Live Tracking**: Real-time GPS tracking with ETA and route visualization
- **Doctor Offers**: Accept/reject doctor offers with 10-second countdown
- **Visit Management**: Complete visit lifecycle from request to completion

#### **3. Medical History & Prescriptions**
- **Visit History**: Complete medical visit records with symptoms, diagnosis, treatment
- **Prescription Management**: Digital prescriptions with medication reminders
- **Health Tracker**: AI-powered health insights and symptom analysis
- **Medical Records**: Comprehensive patient medical history

#### **4. Communication & Support**
- **In-app Chat**: Real-time messaging between patients and doctors
- **Video Calls**: WebRTC-powered video consultations
- **Push Notifications**: Real-time updates for visit status, offers, messages
- **Support System**: FAQ, help tickets, and customer support

#### **5. Emergency Services**
- **Ambulance Integration**: Direct calling to regional emergency numbers
  - 1122 for KPK, Islamabad, Punjab
  - 1158 for Sindh, Balochistan
- **Emergency Contact**: Quick access to emergency services

### **Doctor Features**

#### **1. Doctor Verification System**
- **PMC Certificate**: Pakistan Medical Council verification
- **MBBS Degree**: Medical degree verification
- **CNIC & Selfie**: Identity verification
- **CV & Specialization**: Professional credentials upload
- **Admin Review**: Manual verification by admin panel

#### **2. Patient Management**
- **Patient Requests**: View and accept nearby patient requests
- **Real-time Tracking**: Track patient location and provide ETA
- **Visit Management**: Complete visit workflow from acceptance to completion
- **Patient History**: Access to patient medical records

#### **3. Prescription System**
- **Digital Prescriptions**: Create comprehensive prescriptions
- **Medication Management**: Add multiple medications with dosage, frequency, duration
- **Reminder System**: Set medication reminders for patients
- **Diagnosis Tools**: Disease selection and custom diagnosis

#### **4. Professional Tools**
- **Earnings Tracking**: Monitor visit earnings and ratings
- **Patient Ratings**: Rate patients after visits
- **Visit History**: Complete patient visit records
- **Professional Dashboard**: Doctor-specific interface

### **Admin Features**

#### **1. User Management**
- **Patient Management**: View and manage patient accounts
- **Doctor Verification**: Review and approve doctor applications
- **Admin Management**: System administrator controls

#### **2. System Monitoring**
- **Visit Tracking**: Monitor all active and completed visits
- **Support Management**: Handle customer support tickets
- **Analytics**: System usage and performance metrics

---

## 🔄 User Flows

### **Patient Journey**
1. **Registration/Login** → Email/password authentication
2. **Home Screen** → AI chat, health tracker, service access
3. **Request Doctor** → Location selection → Symptom booking → Image upload
4. **Doctor Matching** → View nearby doctors → Accept offers
5. **Live Tracking** → Real-time doctor location and ETA
6. **Visit** → In-person consultation or video call
7. **Prescription** → Receive digital prescription with reminders
8. **Rating** → Rate doctor experience
9. **History** → View complete medical records

### **Doctor Journey**
1. **Registration** → Email/password signup
2. **Verification** → Upload credentials → Admin approval
3. **Dashboard** → Set availability → View patient requests
4. **Accept Request** → Review patient details → Accept/decline
5. **Navigation** → GPS navigation to patient location
6. **Visit** → Conduct consultation → Write prescription
7. **Complete** → Mark visit complete → Rate patient
8. **Earnings** → Track visit earnings and ratings

---

## 🏗️ Technical Architecture

### **Frontend (React Native)**
- **Navigation**: React Navigation with Drawer Navigator
- **State Management**: React Context API
- **UI Components**: Custom themed components with dark/light mode
- **Maps**: React Native Maps with real-time location tracking
- **Video Calls**: WebRTC integration
- **Notifications**: Expo Notifications with push support

### **Backend (Firebase)**
- **Authentication**: Firebase Auth with email/password
- **Database**: Firestore for real-time data
- **Storage**: Firebase Storage for images and documents
- **Cloud Functions**: Serverless backend logic
- **Hosting**: Firebase Hosting for admin dashboard

### **Key Technologies**
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **Firebase**: Backend-as-a-Service
- **WebRTC**: Real-time communication
- **Google Maps API**: Location services
- **Cloudinary**: Image upload and management

---

## 📊 Data Models (Firestore Collections)

### **users**
- User profiles, roles (patient/doctor), verification status
- Personal information, contact details, preferences

### **doctorPatientMatches**
- Complete visit records with all state information
- Location data, timestamps, ratings, status tracking

### **patientRequests**
- Pending patient requests awaiting doctor assignment
- Symptoms, location, images, status

### **prescriptions**
- Digital prescriptions with medications and reminders
- Patient ID, doctor ID, diagnosis, treatment plan

### **doctorVerifications**
- Doctor credential verification requests
- Document uploads, admin review status

### **supportRequests**
- Customer support tickets and help requests
- User queries, admin responses, resolution status

### **calls**
- Video call session management
- Call status, participants, timestamps

### **notifications**
- Push and in-app notification records
- User preferences, read status, delivery tracking

---

## 🎨 UI/UX Features

### **Design System**
- **Theming**: Dark/light mode support
- **Localization**: English/Urdu bilingual support
- **Animations**: Smooth transitions and micro-interactions
- **Haptic Feedback**: Tactile response for better UX
- **Accessibility**: Screen reader support and accessibility features

### **Key Screens**
- **Home**: AI chat, health tracker, service access
- **Booking**: Multi-step doctor request process
- **Map**: Real-time location and doctor tracking
- **History**: Medical records and visit history
- **Chat**: In-app messaging system
- **Settings**: App preferences and account management

---

## 🔧 Context Providers & State Management

### **AuthContext**
- User authentication state and profile management
- Login/logout/signup functionality
- User role management (patient/doctor)

### **ThemeContext**
- Dark/light mode management
- Color scheme and theming
- UI appearance preferences

### **LanguageContext**
- Bilingual support (English/Urdu)
- Translation management
- Language preferences

### **RequestContext**
- Active patient request tracking
- Request state management
- Booking workflow coordination

🔄 User Journey (Simplified)
Patient opens app → presses “Book Doctor”

### **NotificationContext**
- Push notification management
- In-app notification handling
- Notification preferences

### **RatingContext**
- Rating system management
- User feedback handling
- Rating display and updates

---

## 🚀 Deployment & Infrastructure

### **Mobile App**
- **Platforms**: iOS and Android
- **Distribution**: App Store and Google Play Store
- **Updates**: Over-the-air updates via Expo

### **Admin Dashboard**
- **Platform**: Web-based dashboard
- **Hosting**: Firebase Hosting
- **Access**: Admin-only authentication

### **Backend Services**
- **Database**: Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage + Cloudinary
- **Functions**: Firebase Cloud Functions

---

## 📈 Business Model

### **Revenue Streams**
1. **Commission Model**: 15-20% commission on doctor consultations
2. **Subscription Plans**: Premium features for doctors
3. **Emergency Services**: Partnership with ambulance services
4. **Pharmacy Integration**: Medicine delivery partnerships
5. **Insurance Partnerships**: Health insurance integration

### **Target Market**
- **Primary**: Urban middle-class families in Pakistan
- **Secondary**: Elderly patients, parents with sick children
- **Tertiary**: Chronic patients, individuals without nearby clinics

---

## 🔒 Security & Compliance

### **Data Protection**
- **Encryption**: End-to-end encryption for sensitive data
- **Authentication**: Secure user authentication
- **Authorization**: Role-based access control
- **Privacy**: GDPR-compliant data handling

### **Healthcare Compliance**
- **PMDC Regulations**: Pakistan Medical Council compliance
- **Telemedicine Guidelines**: Digital health regulations
- **Patient Privacy**: HIPAA-equivalent standards

---

## Summary

MUCUS is a comprehensive, full-stack healthcare platform that addresses the critical need for accessible medical care in Pakistan. With its AI-powered features, real-time tracking, comprehensive doctor verification, and emergency services integration, it provides a complete solution for both patients and healthcare providers. The app's modern architecture, robust state management, and user-friendly design make it a powerful tool for transforming healthcare delivery in the Pakistani market.

# Doctor-Patient Matchmaking & Card Display Conditions (Inspired by inDrive)

This section outlines all the rules and timing conditions for showing/hiding patient and doctor cards during the search/match process, similar to logic found in ride-hailing apps like inDrive.

---

## General Principles
- **Cards (requests/offers) are only shown if both parties are actively searching.**
- **No duplicate cards:** The same patient/doctor card should not appear multiple times in one session.

---

## Patient Cancels Search
- **Effect:** The patient's request is removed or marked as cancelled.
- **Doctor Side:** Doctors immediately stop seeing this patient card.
- **Persistence:** Permanent for that request (unless a new request is created).

---

## Doctor Rejects Patient Request
- **Effect:** Doctor chooses to reject a patient card.
- **Rule:** Do not show this patient card to the same doctor again for **1 minute**.
- **Condition:** Only re-show if both doctor and patient are still searching after 1 minute.
- **Persistence:** Store rejection timestamp (local or Firestore).

---

## Patient Rejects Doctor Offer
- **Effect:** Patient chooses to reject a doctor offer.
- **Rule:** Do not show this doctor card to the same patient again for **1 minute **.
- **Condition:** Only re-show if both patient and doctor are still searching 1 minute.
- **Persistence:** Store rejection timestamp (local or Firestore).

---

## Doctor Card Times Out (e.g., 10-second timer expires)
- **Effect:** Doctor card disappears from patient's available doctors box due to timeout.
- **Rule:** Do not show this doctor card to the same patient again for **30 seconds**.
- **Condition:** Only re-show if both patient and doctor are still searching after 30 seconds.
- **Persistence:** Store timeout timestamp (local or Firestore).

---

## Duplicate Card Prevention
- **Effect:** Prevent the same patient card from appearing multiple times to the same doctor (and vice versa).
- **Rule:** Always filter by unique request/doctor ID in the UI and logic.

---

## Doctor in Active Visit
- **Effect:** Once a doctor has taken up a visit and the visit has started (visit is active),
  do not show the doctor any more patient cards.
- **Rule:** Doctor should not receive or see new patient requests/cards until the current visit is completed or ended.
- **Persistence:** Enforced by checking the doctor's active visit status in local state or Firestore.

---

## Summary Table

| Condition                  | Who    | Hide Duration | Both Searching? | Persistence      | When to Show Again                |
|----------------------------|--------|--------------|-----------------|------------------|-----------------------------------|
| Patient cancels search     | Doctor | Forever      | N/A             | Request status   | Never (unless new request)        |
| Doctor rejects patient     | Doctor | 1 min        | Yes             | Local/Firestore  | After 1 min, if both searching    |
| Patient rejects doctor     | Patient| 30 sec       | Yes             | Local/Firestore  | After 30 sec, if both searching   |
| Doctor card times out      | Patient| 10 sec       | Yes             | Local/Firestore  | After 10 sec, if both searching   |
| Duplicate card prevention  | Both   | N/A          | N/A             | Local            | Never (filter by ID)              |

---

## Implementation Notes
- Always check the status of both users (doctor and patient) before showing a card.
- Store rejection/timer data with timestamps for accurate filtering.
- Use local state for session-only logic, Firestore for persistence across devices.
- These rules help prevent spam, improve user experience, and mimic the fairness logic of apps like inDrive.






