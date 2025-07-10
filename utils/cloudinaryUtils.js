import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '@env';

/**
 * Uploads an image to Cloudinary
 * @param {string} uri - The local URI of the image to upload
 * @param {string} folder - The folder in Cloudinary to store the image
 * @returns {Promise<string>} - The URL of the uploaded image
 */
export const uploadImageToCloudinary = async (uri, folder = 'doctor_verification') => {
  try {
    // Create form data for the image upload
    const formData = new FormData();
    
    // Get the filename from the URI
    const filename = uri.split('/').pop();
    
    // Determine the file type
    const match = /\.([\w]+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image';
    
    // Append the image to the form data
    formData.append('file', {
      uri,
      name: filename,
      type,
    });
    
    // Add upload parameters
    formData.append('upload_preset', 'my_unsigned_preset'); // Create an unsigned upload preset in your Cloudinary dashboard
    formData.append('folder', folder);
    
    // Make the upload request to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    const data = await response.json();
    
    if (response.ok) {
      return data.secure_url;
    } else {
      throw new Error(data.error?.message || 'Failed to upload image');
    }
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Uploads multiple images to Cloudinary
 * @param {Array<string>} uris - Array of image URIs to upload
 * @param {string} folder - The folder in Cloudinary to store the images
 * @returns {Promise<Array<string>>} - Array of uploaded image URLs
 */
export const uploadMultipleImagesToCloudinary = async (uris, folder = 'doctor_verification') => {
  try {
    const uploadPromises = uris.map(uri => uploadImageToCloudinary(uri, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple images to Cloudinary:', error);
    throw error;
  }
};