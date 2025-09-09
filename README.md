### **Picaboo: A Social Media Platform for Sharing Moments**  
Link: https://picaboo-gsel.onrender.com/

Picaboo is a **full-stack social media application** built with **Node.js, Express, MongoDB, and Socket.IO**, designed for users to share images, connect with friends, and chat in real-time.  

#### **Key Features:**  

1. **User Authentication**  
   - Secure signup/login with **bcrypt password hashing**.  
   - Session-based authentication using **express-session**.  

2. **Image Posts with Captions**  
   - Users can upload images with captions.  
   - Images are processed with **Sharp** (resizing & compression).  
   - Stored in **MongoDB GridFS** for efficient file handling.  
   - Like functionality with real-time updates.  

3. **Explore Feed**  
   - View all posts in a responsive grid layout.  
   - Like posts without page reloads (AJAX-based).  

4. **Real-Time Chat**  
   - **Socket.IO** for instant messaging.  
   - Persistent chat history stored in MongoDB.  
   - Unread message indicators.  
   - Conversation tracking with read receipts.  

5. **Friends & Search**  
   - Add friends by username.  
   - Search for users dynamically.  

6. **Profile Management**  
   - View personal posts and friend count.  
   - Delete posts (with image cleanup in GridFS).  

7. **Responsive UI**  
   - Built with **Tailwind CSS** for a clean, modern design.  

#### **Tech Stack:**  
- **Backend:** Node.js, Express, MongoDB (with GridFS)  
- **Frontend:** HTML, EJS, Tailwind CSS  
- **Real-Time:** Socket.IO  
- **Image Processing:** Sharp, Multer  
- **Authentication:** bcrypt, express-session  

Picaboo is a **complete social media experience**, combining **image sharing, social interactions, and real-time chat** in one platform. 🚀  
