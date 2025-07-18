
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    document.getElementById("auth-section").innerHTML = 
      '<p>Welcome, ' + user.email + '</p><button onclick="logout()">Logout</button>';
  } else {
    document.getElementById("auth-section").innerHTML = 
      '<button onclick="login()">Login</button>' +
      '<button onclick="signup()">Sign Up</button>';
  }
});

function login() {
  const email = prompt("Enter email:");
  const password = prompt("Enter password:");
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => alert("Logged in successfully!"))
    .catch((error) => alert("Login error: " + error.message));
}

function signup() {
  const email = prompt("Enter email:");
  const password = prompt("Enter password:");
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(() => alert("Account created!"))
    .catch((error) => alert("Signup error: " + error.message));
}

function logout() {
  firebase.auth().signOut().then(() => alert("Logged out!"));
}

function uploadFile() {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("Please login first.");
    return;
  }

  const fileInput = document.getElementById("fileInput");
  if (fileInput.files.length === 0) {
    alert("Choose a file first!");
    return;
  }

  const file = fileInput.files[0];
  const storageRef = firebase.storage().ref("uploads/" + file.name);

  storageRef.put(file).then((snapshot) => {
    snapshot.ref.getDownloadURL().then((url) => {
      firebase.firestore().collection("posts").add({
        url: url,
        name: file.name,
        user: user.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likes: []
      }).then(() => {
        alert("File uploaded and saved!");
        loadPosts();
      });
    });
  }).catch((error) => {
    alert("Upload failed: " + error.message);
  });
}

function toggleLike(postId, currentLikes) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const liked = currentLikes.includes(user.email);
  const updatedLikes = liked 
    ? currentLikes.filter(email => email !== user.email) 
    : [...currentLikes, user.email];

  firebase.firestore().collection("posts").doc(postId).update({
    likes: updatedLikes
  }).then(() => {
    loadPosts();
  });
}

function addComment(postId) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("Login to comment.");
    return;
  }
  const comment = prompt("Your comment:");
  if (!comment) return;

  firebase.firestore().collection("posts").doc(postId).collection("comments").add({
    user: user.email,
    comment: comment,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    loadPosts();
  });
}

function loadComments(postId, container) {
  firebase.firestore().collection("posts").doc(postId).collection("comments")
    .orderBy("timestamp", "asc").get().then(snapshot => {
      container.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const comment = document.createElement("p");
        comment.innerHTML = `<strong>${data.user}:</strong> ${data.comment}`;
        container.appendChild(comment);
      });
    });
}

function loadPosts() {
  const postList = document.getElementById("postList");
  postList.innerHTML = "<p>Loading posts...</p>";
  firebase.firestore().collection("posts").orderBy("timestamp", "desc").get()
    .then(snapshot => {
      postList.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const postId = doc.id;
        const postElement = document.createElement("div");

        const media = data.url.endsWith(".mp4") ?
          `<video controls width="300"><source src="${data.url}" type="video/mp4"></video>` :
          `<img src="${data.url}" width="300" />`;

        const likeCount = data.likes.length;
        const user = firebase.auth().currentUser;
        const liked = user && data.likes.includes(user.email);
        const likeText = liked ? "❤️ Unlike" : "🤍 Like";

        postElement.innerHTML = `
          <p><strong>${data.user}</strong> posted:</p>
          ${media}
          <p><button onclick="toggleLike('${postId}', ${JSON.stringify(data.likes)})">${likeText}</button> ${likeCount} likes</p>
          <button onclick="addComment('${postId}')">💬 Comment</button>
          <div id="comments-${postId}">Loading comments...</div>
          <hr />
        `;
        postList.appendChild(postElement);
        loadComments(postId, document.getElementById(`comments-${postId}`));
      });
    });
}

window.onload = loadPosts;
