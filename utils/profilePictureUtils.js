import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const fetchUserProfilePicture = async (userId) => {
  try {
    if (!userId) return null;
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;
    const userData = userDoc.data();
    if (userData.isDoctor) {
      if (userData.verificationSelfie) return userData.verificationSelfie;
      if (userData.profilePicture) return userData.profilePicture;
    } else {
      if (userData.profilePicture) return userData.profilePicture;
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const fetchMultipleUserProfilePictures = async (userIds) => {
  const result = {};
  await Promise.all(userIds.map(async (id) => {
    result[id] = await fetchUserProfilePicture(id);
  }));
  return result;
}; 