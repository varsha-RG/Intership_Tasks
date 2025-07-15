// Socket.IO connection
const socket = io();

// DOM Elements
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages');
const roomsList = document.querySelector('#rooms-list .list-container');
const privateList = document.querySelector('#private-list .list-container');
const createRoomModal = document.getElementById('create-room-modal');
const userSearchModal = document.getElementById('user-search-modal');
const loadingElement = document.getElementById('loading');

// Helper function to show/hide loading animation
function showLoading() {
    loadingElement.classList.add('visible');
}

function hideLoading() {
    loadingElement.classList.remove('visible');
}

// State Management
let currentUser = null;
let currentChat = null;
let authToken = localStorage.getItem('authToken');

// Check Authentication Status
if (authToken) {
    fetchUserProfile();
}

// Auth Tab Switching
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const formType = tab.dataset.form;
        document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
        document.getElementById(`${formType}-form`).classList.remove('hidden');
    });
});

// Auth Forms Handling
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.elements[0].value;
    const password = e.target.elements[1].value;
    
    // Show loading animation
    showLoading();
    
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed');
        }
        
        const data = await response.json();
        handleAuthSuccess(data);
    } catch (error) {
        hideLoading();
        alert(error.message || 'Login failed. Please try again.');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = e.target.elements[0].value;
    const email = e.target.elements[1].value;
    const password = e.target.elements[2].value;
    
    // Show loading animation
    showLoading();
    
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Registration failed');
        }
        
        const data = await response.json();
        handleAuthSuccess(data);
    } catch (error) {
        hideLoading();
        alert(error.message || 'Registration failed. Please try again.');
    }
});

// Chat Functionality
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message || !currentChat) return;
    
    const messageData = {
        content: message,
        sender: currentUser._id,
        timestamp: new Date()
    };
    
    if (currentChat.type === 'room') {
        messageData.roomId = currentChat._id;
        messageData.messageType = 'room';
        socket.emit('sendMessage', messageData);
    } else {
        messageData.toUserId = currentChat._id;
        messageData.messageType = 'private';
        socket.emit('privateMessage', messageData);
    }
    
    messageInput.value = '';
    appendMessage(messageData, true);
});

// Socket Event Handlers
socket.on('message', (data) => {
    if (currentChat && currentChat.type === 'room' && currentChat._id === data.roomId) {
        appendMessage(data, false);
    }
});

socket.on('userLeft', (data) => {
    if (currentChat && currentChat.type === 'room' && currentChat._id === data.roomId) {
        appendMessage({ content: `👋 ${data.username} left the chatroom` }, false, true);
        // Update member count
        const membersCount = document.getElementById('members-count');
        const currentCount = parseInt(membersCount.textContent.match(/\d+/) || 0);
        membersCount.textContent = `Members: ${currentCount - 1}`;
    }
});

socket.on('userStatus', (data) => {
    const userItem = Array.from(document.querySelectorAll('.chat-item'))
        .find(item => item.querySelector('.room-name').textContent === data.username);
    if (userItem) {
        userItem.classList.toggle('online', data.status === 'online');
    }
});

socket.on('userJoined', (data) => {
    if (currentChat && currentChat.type === 'room' && currentChat._id === data.roomId) {
        appendMessage({ content: `👋 ${data.username} joined the chatroom` }, false, true);
        // Update member count
        const membersCount = document.getElementById('members-count');
        const currentCount = parseInt(membersCount.textContent.match(/\d+/) || 0);
        membersCount.textContent = `Members: ${currentCount + 1}`;
    }
});

socket.on('privateMessage', (data) => {
    if (currentChat && currentChat.type === 'private' && 
        (currentChat._id === data.fromUserId || currentChat._id === data.toUserId)) {
        appendMessage(data, false);
    }
});

// UI Helper Functions
function appendMessage(message, isSent, isSystem = false) {
    const messageElement = document.createElement('div');
    
    if (isSystem) {
        messageElement.classList.add('system-message');
        messageElement.textContent = message.content;
    } else {
        messageElement.classList.add('message', isSent ? 'sent' : 'received');
        
        // Create message header with avatar and username
        const messageHeader = document.createElement('div');
        messageHeader.classList.add('message-header');
        
        // Add avatar with error handling
        const avatar = document.createElement('img');
        avatar.classList.add('message-avatar');
        avatar.src = isSent ? (currentUser.avatar || 'default-avatar.svg') : 
                   (message.sender?.avatar || 'default-avatar.svg');
        avatar.alt = 'User Avatar';
        avatar.onerror = function() {
            this.src = 'default-avatar.svg';
            this.onerror = null; // Prevent infinite loop
        };
        messageHeader.appendChild(avatar);
        
        // Add username for room messages
        if (currentChat.type === 'room') {
            const username = document.createElement('div');
            username.classList.add('message-username');
            username.textContent = isSent ? currentUser.username : (message.sender?.username || 'Unknown User');
            messageHeader.appendChild(username);
        }
        
        messageElement.appendChild(messageHeader);

        // Add message content
        const content = document.createElement('div');
        content.classList.add('message-content');
        content.textContent = message.content;
        messageElement.appendChild(content);

        // Add timestamp
        const timestamp = document.createElement('span');
        timestamp.classList.add('timestamp');
        const date = new Date(message.createdAt || message.timestamp);
        timestamp.textContent = date.getHours().toString().padStart(2, '0') + ':' + 
                               date.getMinutes().toString().padStart(2, '0');
        messageElement.appendChild(timestamp);
    }

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadRooms() {
    try {
        const response = await fetch('/api/rooms/my', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const rooms = await response.json();

        roomsList.innerHTML = '';
        rooms.forEach(room => {
            const roomElement = createChatListItem(room, 'room');
            roomsList.appendChild(roomElement);
        });
    } catch (error) {
        console.error('Failed to load rooms:', error);
    }
}

// Load all public rooms for joining/search
async function loadPublicRooms(query = '') {
    try {
        let url = '/api/rooms/public';
        if (query) url = `/api/rooms/search?query=${encodeURIComponent(query)}&type=public`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const rooms = await response.json();
        // Show rooms in a modal or list for joining
        // You can implement a modal to show these rooms with join buttons
    } catch (error) {
        console.error('Failed to load public rooms:', error);
    }
}

async function loadPrivateChats() {
    try {
        const response = await fetch('/api/users/contacts', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        privateList.innerHTML = '';
        // Show private chats (DMs)
        if (Array.isArray(data.privateChats)) {
            data.privateChats.forEach(chat => {
                if (chat.with) {
                    const chatElement = createChatListItem(chat.with, 'private');
                    privateList.appendChild(chatElement);
                }
            });
        }
        // Show contacts as well
        if (Array.isArray(data.contacts)) {
            data.contacts.forEach(contact => {
                const contactElement = createChatListItem(contact, 'private');
                privateList.appendChild(contactElement);
            });
        }
    } catch (error) {
        console.error('Failed to load contacts:', error);
    }
}

function createChatListItem(chat, type) {
    const element = document.createElement('div');
    element.classList.add('chat-item');
    
    // Add avatar with error handling
     const avatar = document.createElement('img');
     avatar.classList.add('chat-item-avatar');
     
     if (type === 'room') {
         avatar.src = 'default-avatar.svg'; // Default room avatar
         avatar.alt = 'Room Icon';
         
         const roomName = document.createElement('span');
         roomName.classList.add('room-name');
         roomName.textContent = chat.name;
         
         element.appendChild(avatar);
         element.appendChild(roomName);
     } else {
         avatar.src = chat.avatar || 'default-avatar.svg';
         avatar.alt = 'User Avatar';
         avatar.onerror = function() {
             this.src = 'default-avatar.svg';
             this.onerror = null; // Prevent infinite loop
         };
         
         const userName = document.createElement('span');
         userName.classList.add('room-name');
         userName.textContent = chat.username;
         
         element.appendChild(avatar);
         element.appendChild(userName);
     }
    // Add double-click handler for room members
if (type === 'room') {
    element.addEventListener('dblclick', async () => {
        try {
            const response = await fetch(`/api/rooms/${chat._id}/members`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await response.json();
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>Room Members</h2>
                    <div class="members-list"></div>
                    <button class="cancel-button">Close</button>
                </div>
            `;
            
            const membersList = modal.querySelector('.members-list');
            data.members.forEach(member => {
                const memberItem = document.createElement('div');
                memberItem.className = 'member-item';
                // Create elements manually to handle image errors
                const avatar = document.createElement('img');
                avatar.className = 'member-avatar';
                avatar.src = member.avatar || 'default-avatar.svg';
                avatar.alt = 'Member Avatar';
                avatar.onerror = function() {
                    this.src = 'default-avatar.svg';
                    this.onerror = null; // Prevent infinite loop
                };
                
                const username = document.createElement('span');
                username.className = 'member-name';
                username.textContent = member.username;
                
                const status = document.createElement('span');
                status.className = `member-status ${member.online ? 'online' : 'offline'}`;
                
                memberItem.appendChild(avatar);
                memberItem.appendChild(username);
                memberItem.appendChild(status);
                membersList.appendChild(memberItem);
            });
            
            document.body.appendChild(modal);
            modal.querySelector('.cancel-button').onclick = () => modal.remove();
        } catch (error) {
            console.error('Failed to load room members:', error);
        }
    });
}

element.addEventListener('click', async () => {
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
        element.classList.add('active');
        currentChat = { ...chat, type };
        await loadMessages();
        if (type === 'room') {
            socket.emit('joinRoom', `room_${chat._id}`);
            document.getElementById('chat-title').textContent = chat.name;
            document.getElementById('members-count').textContent = chat.members ? `Members: ${chat.members.length}` : '';
            // Show room code for private rooms
            if (chat.type === 'private' && chat.roomCode) {
                document.getElementById('members-count').innerHTML += ` | Room Code: <span id="room-code">${chat.roomCode}</span> <button id="copy-room-code">Copy</button>`;
                setTimeout(() => {
                    const copyBtn = document.getElementById('copy-room-code');
                    if (copyBtn) {
                        copyBtn.onclick = () => {
                            navigator.clipboard.writeText(chat.roomCode);
                            copyBtn.textContent = 'Copied!';
                            setTimeout(() => copyBtn.textContent = 'Copy', 1000);
                        };
                    }
                }, 100);
            }
            document.getElementById('leave-chat').classList.remove('hidden');
        } else {
            document.getElementById('chat-title').textContent = chat.username;
            document.getElementById('members-count').textContent = '';
            document.getElementById('leave-chat').classList.add('hidden');
        }
        messageInput.disabled = false;
        messageForm.querySelector('button').disabled = false;
    });
    return element;
}

async function loadMessages() {
    messagesContainer.innerHTML = '';
    try {
        const endpoint = currentChat.type === 'room'
            ? `/api/messages/room/${currentChat._id}`
            : `/api/messages/private/${currentChat._id}`;

        const response = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        data.messages.forEach(message => {
            appendMessage(message, message.sender._id === currentUser._id);
        });
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

async function fetchUserProfile() {
    // Make sure loading is visible
    showLoading();
    try {
        const response = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            currentUser = await response.json();
            document.getElementById('username').textContent = currentUser.username;
            
            // Set user avatar with fallback to default
            const userAvatar = document.getElementById('user-avatar');
            userAvatar.src = currentUser.avatar || 'default-avatar.svg';
            userAvatar.onerror = function() {
                this.src = 'default-avatar.svg';
                this.onerror = null; // Prevent infinite loop
            };

            // Add animation class to chat container
            authContainer.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            setTimeout(() => {
                chatContainer.classList.add('visible');
            }, 100);

            socket.emit('authenticate', authToken);
            try {
                await loadRooms();
                await loadPrivateChats();
            } catch (loadError) {
                console.error('Error loading chats:', loadError);
            } finally {
                // Always hide loading when done
                hideLoading();
            }
        } else {
            console.error('Failed to fetch profile: Status', response.status);
            hideLoading();
            localStorage.removeItem('authToken');
            authToken = null;
            // Show auth container again
            chatContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        hideLoading();
        localStorage.removeItem('authToken');
        authToken = null;
        // Show auth container again
        chatContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
}

function handleAuthSuccess(data) {
    authToken = data.token;
    localStorage.setItem('authToken', authToken);
    // Make sure loading is visible before fetching profile
    showLoading();
    fetchUserProfile();
}

// Modal Handling
document.getElementById('create-room').addEventListener('click', () => {
    createRoomModal.classList.remove('hidden');
});

document.getElementById('new-chat').addEventListener('click', () => {
    userSearchModal.classList.remove('hidden');
});

document.querySelectorAll('.cancel-button').forEach(button => {
    button.addEventListener('click', () => {
        button.closest('.modal').classList.add('hidden');
    });
});

// Create Room Form Handling
document.getElementById('create-room-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.elements[0].value;
    const description = e.target.elements[1].value;
    const type = e.target.elements[2].value;

    try {
        const response = await fetch('/api/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, description, type })
        });

        if (response.ok) {
            createRoomModal.classList.add('hidden');
            await loadRooms();
        } else {
            const data = await response.json();
            alert(data.error);
        }
    } catch (error) {
        alert('Failed to create room. Please try again.');
    }
});

// User Search Handling
let searchTimeout;
const userSearchInput = document.getElementById('user-search');
userSearchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query.length < 2) return;

        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const users = await response.json();

            const resultsContainer = document.getElementById('search-results');
            resultsContainer.innerHTML = '';

            users.forEach(user => {
                const userElement = document.createElement('div');
            userElement.classList.add('search-result-item');
            // Create elements manually to handle image errors
            const avatar = document.createElement('img');
            avatar.className = 'search-avatar';
            avatar.src = user.avatar || 'default-avatar.svg';
            avatar.alt = 'User Avatar';
            avatar.onerror = function() {
                this.src = 'default-avatar.svg';
                this.onerror = null; // Prevent infinite loop
            };
            
            const username = document.createElement('span');
            username.className = 'search-username';
            username.textContent = user.username;
            
            userElement.appendChild(avatar);
            userElement.appendChild(username);

            userElement.addEventListener('click', async () => {
                userSearchModal.classList.add('hidden');
                await startPrivateChat(user);
            });

                resultsContainer.appendChild(userElement);
            });
        } catch (error) {
            console.error('User search failed:', error);
        }
    }, 300);
});

async function startPrivateChat(user) {
    // Ensure private chat exists in DB
    await fetch(`/api/users/chat/${user._id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    currentChat = { ...user, type: 'private' };
    await loadMessages();

    const existingChat = Array.from(privateList.children)
        .find(item => item.textContent === user.username);

    if (!existingChat) {
        const chatElement = createChatListItem(user, 'private');
        privateList.appendChild(chatElement);
        chatElement.click();
    } else {
        existingChat.click();
    }
}

// Sidebar Tab Switching
document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const listType = tab.dataset.tab;
        document.getElementById('rooms-list').classList.toggle('hidden', listType !== 'rooms');
        document.getElementById('private-list').classList.toggle('hidden', listType !== 'private');
    });
});

// Leave room functionality
document.getElementById('leave-chat').addEventListener('click', async () => {
    if (currentChat && currentChat.type === 'room') {
        try {
            const response = await fetch(`/api/rooms/${currentChat._id}/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                socket.emit('leaveRoom', `room_${currentChat._id}`);
                await loadRooms();
                currentChat = null;
                messagesContainer.innerHTML = '';
                document.getElementById('chat-title').textContent = 'Select a chat';
                document.getElementById('members-count').textContent = '';
                document.getElementById('leave-chat').classList.add('hidden');
                messageInput.disabled = true;
                messageForm.querySelector('button').disabled = true;
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to leave room');
            }
        } catch (error) {
            console.error('Failed to leave room:', error);
            alert('Failed to leave room. Please try again.');
        }
    }
});

// Add sign out button logic
document.getElementById('user-avatar').addEventListener('click', () => {
    if (confirm('Sign out?')) {
        fetch('/api/users/signout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        }).finally(() => {
            localStorage.removeItem('authToken');
            authToken = null;
            chatContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
        });
    }
});

// Show available rooms to join (modal/list)
async function showAvailableRooms() {
    try {
        const response = await fetch('/api/rooms/available', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const rooms = await response.json();
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Available Rooms</h2>
                <div id="available-rooms-list"></div>
                <button class="cancel-button">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.cancel-button').onclick = () => modal.remove();
        const list = modal.querySelector('#available-rooms-list');
        if (rooms.length === 0) {
            list.textContent = 'No rooms available to join.';
        } else {
            rooms.forEach(room => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = `${room.name} (${room.type}${room.type === 'private' ? ', code required' : ''})`;
                const joinBtn = document.createElement('button');
                joinBtn.textContent = 'Join';
                joinBtn.onclick = async () => {
                    let code = '';
                    if (room.type === 'private') {
                        code = prompt('Enter room code:');
                        if (!code) return;
                    }
                    const joinRes = await fetch(`/api/rooms/${room._id}/join`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({ roomCode: code })
                    });
                    const joinData = await joinRes.json();
                    if (joinRes.ok) {
                        alert('Joined room!');
                        modal.remove();
                        await loadRooms();
                    } else {
                        alert(joinData.error || 'Failed to join room');
                    }
                };
                item.appendChild(joinBtn);
                list.appendChild(item);
            });
        }
    } catch (error) {
        alert('Failed to load available rooms');
    }
}

// Add a button to sidebar to show available rooms
const showRoomsBtn = document.createElement('button');
showRoomsBtn.textContent = 'Join Room';
showRoomsBtn.className = 'create-button';
showRoomsBtn.onclick = showAvailableRooms;
document.getElementById('rooms-list').prepend(showRoomsBtn);

// Join Room Button Logic (for public/private rooms)
// You can add a modal/list to show available rooms and join them
// For private rooms, prompt for room code before joining