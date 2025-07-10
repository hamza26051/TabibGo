import { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import '../firebase/config'; // Ensure Firebase is initialized

const db = getFirestore();

// Save a rating for a visit
export const saveRating = async (visitId, role, rating, userId) => {
  // role: 'doctor' or 'patient'
  const ratingField = role === 'doctor' ? 'doctorRating' : 'patientRating';
  const userField = role === 'doctor' ? 'doctorId' : 'patientId';
  const recipientField = role === 'doctor' ? 'patientId' : 'doctorId';
  const visitRef = doc(db, 'doctorPatientMatches', visitId);
  try {
    // Always set the userId field as well as the rating
    await updateDoc(visitRef, { [ratingField]: rating, [userField]: userId });
    console.log(`Successfully saved ${ratingField}: ${rating} and ${userField}: ${userId} for matchId: ${visitId}`);

    // Fetch the visit to get the recipient userId
    const visitSnap = await getDoc(visitRef);
    if (visitSnap.exists()) {
      const visitData = visitSnap.data();
      const recipientId = visitData[recipientField];
      if (recipientId) {
        // Create a notification for the recipient
        await addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          type: 'rating',
          title: 'You received a new rating!',
          message: `You received a rating from ${role === 'doctor' ? 'the patient' : 'the doctor'}.`,
          createdAt: serverTimestamp(),
          read: false,
          visitId,
          rating
        });
      }
    }
  } catch (error) {
    console.error(`Error saving ${ratingField} for matchId: ${visitId}`, error);
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`Error saving rating: ${error.message}`);
    }
    // For React Native, also show an alert if possible
    if (typeof Alert !== 'undefined') {
      Alert.alert('Error', `Could not save rating: ${error.message}`);
    }
    throw error;
  }
};

// Fetch ratings for a user (as doctor or patient)
export const fetchUserRatings = async (userId, role) => {
  // role: 'doctor' or 'patient'
  const field = role === 'doctor' ? 'doctorId' : 'patientId';
  const ratingField = role === 'doctor' ? 'doctorRating' : 'patientRating';
  const visitsRef = collection(db, 'doctorPatientMatches');
  const q = query(
    visitsRef,
    where(field, '==', userId),
    where(ratingField, '>=', 1)
  );
  const querySnapshot = await getDocs(q);
  const ratings = [];
  console.log(`[fetchUserRatings] userId: ${userId}, role: ${role}, field: ${field}, ratingField: ${ratingField}, found docs: ${querySnapshot.size}`);
  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    console.log(`[fetchUserRatings] docId: ${docSnap.id}, data:`, data);
    ratings.push(data[ratingField]);
  });
  return ratings;
};

// Calculate average rating for a user
export const getAverageRating = async (userId, role) => {
  const ratings = await fetchUserRatings(userId, role);
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return sum / ratings.length;
}; 