// 24 Dakka - Main Application
// Supabase Client
let supabaseClient;
let currentUser = null;
let selectedVideoFile = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Check if config exists
    if (typeof SUPABASE_CONFIG === 'undefined') {
        console.log('Config bulunamadı. Lütfen config.js dosyasını oluşturun.');
        alert('Lütfen config.js dosyasını oluşturun ve Supabase bilgilerinizi girin. Detaylar için KURULUM.md dosyasına bakın.');
        return;
    }

    // Initialize Supabase
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

    // Check auth state
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        await loadLeaderboard();
        await loadVideos();
    } else {
        showAuthModal();
    }

    // Event listeners
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Profile button
    document.getElementById('profileBtn').addEventListener('click', () => {
        if (currentUser) {
            showProfileMenu();
        } else {
            showAuthModal();
        }
    });

    // Upload card
    document.getElementById('uploadCard').addEventListener('click', () => {
        if (!currentUser) {
            alert('Video yüklemek için giriş yapmalısınız!');
            showAuthModal();
            return;
        }
        showUploadModal(); // Directly open upload modal
    });

    // Video input (now inside the upload modal, assuming 'videoFile' is the new ID)
    document.getElementById('videoFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedVideoFile = file;
            document.getElementById('selectedFileName').textContent = file.name;
        } else {
            selectedVideoFile = null;
            document.getElementById('selectedFileName').textContent = 'Dosya seçilmedi';
        }
    });

    // Auth modal
    document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);
    document.getElementById('toggleAuth').addEventListener('click', toggleAuthMode);
    document.getElementById('authForm').addEventListener('submit', handleAuth);

    // Upload modal
    document.getElementById('closeUploadModal').addEventListener('click', closeUploadModal);
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);

    // Video modal
    document.getElementById('closeVideoModal').addEventListener('click', closeVideoModal);

    // Comments sidebar
    document.getElementById('closeComments').addEventListener('click', closeCommentsSidebar);
    document.getElementById('sendCommentBtn').addEventListener('click', handleSendComment);
    document.getElementById('commentInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendComment();
        }
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// Auth functions
function showAuthModal() {
    document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

let isSignUp = false;
function toggleAuthMode(e) {
    e.preventDefault();
    isSignUp = !isSignUp;
    const title = document.getElementById('authTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleLink = document.getElementById('toggleAuth');
    const usernameGroup = document.getElementById('usernameGroup');

    if (isSignUp) {
        title.textContent = 'Kayıt Ol';
        submitBtn.textContent = 'Kayıt Ol';
        toggleLink.textContent = 'Zaten hesabın var mı? Giriş yap';
        usernameGroup.style.display = 'block';
    } else {
        title.textContent = 'Giriş Yap';
        submitBtn.textContent = 'Giriş Yap';
        toggleLink.textContent = 'Hesabın yok mu? Kayıt ol';
        usernameGroup.style.display = 'none';
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const username = document.getElementById('authUsername').value;
    const submitBtn = document.getElementById('authSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>';

    try {
        if (isSignUp) {
            // Sign up
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password
            });

            if (error) throw error;

            // Create user profile
            const { error: profileError } = await supabaseClient
                .from('users')
                .insert([{
                    id: data.user.id,
                    username: username || email.split('@')[0],
                    email: email,
                    avatar_url: null
                }]);

            if (profileError) throw profileError;

            currentUser = data.user;
            alert('Kayıt başarılı! Hoş geldiniz!');
        } else {
            // Sign in
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            currentUser = data.user;
        }

        closeAuthModal();
        await loadUserProfile();
        await loadLeaderboard();
        await loadVideos();
    } catch (error) {
        alert('Hata: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUp ? 'Kayıt Ol' : 'Giriş Yap';
    }
}

async function loadUserProfile() {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (error) {
        console.error('Profile load error:', error);
        return;
    }

    if (data) {
        document.getElementById('profileBtn').textContent = data.username;
        currentUserData = data;
    }
}

let currentUserData = null;

function showProfileMenu() {
    showProfileModal();
}

function showProfileModal() {
    // Create profile modal if it doesn't exist
    let modal = document.getElementById('profileModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profileModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Profil</h2>
                    <button class="close-btn" id="closeProfileModal">&times;</button>
                </div>
                <div style="text-align: center; margin-bottom: var(--spacing-lg);">
                    <div style="width: 100px; height: 100px; margin: 0 auto var(--spacing-md); border-radius: 50%; background: linear-gradient(135deg, var(--orange-primary), var(--orange-secondary)); display: flex; align-items: center; justify-content: center; font-size: 3rem; color: white; position: relative; overflow: hidden;" id="profileAvatarPreview">
                        ${currentUserData?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <input type="file" id="avatarInput" accept="image/*" style="display: none;">
                    <button class="btn-primary" style="width: auto; padding: var(--spacing-xs) var(--spacing-md); font-size: 0.9rem; margin-bottom: var(--spacing-sm);" id="changeAvatarBtn">Profil Fotoğrafı Değiştir</button>
                    <div style="color: var(--orange-light); font-weight: 600; font-size: 1.2rem; margin-bottom: var(--spacing-xs);">${currentUserData?.username || 'Kullanıcı'}</div>
                    <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; margin-bottom: var(--spacing-md);">${currentUserData?.email || ''}</div>
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 0.85rem;">${currentUserData?.video_count || 0} içerik yüklendi</div>
                </div>
                <button class="btn-primary" id="logoutBtn" style="background: linear-gradient(135deg, #dc2626, #991b1b);">Çıkış Yap</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('closeProfileModal').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Çıkış yapmak istiyor musunuz?')) {
                supabaseClient.auth.signOut();
                currentUser = null;
                location.reload();
            }
        });

        document.getElementById('changeAvatarBtn').addEventListener('click', () => {
            document.getElementById('avatarInput').click();
        });

        document.getElementById('avatarInput').addEventListener('change', handleAvatarUpload);
    }

    // Update avatar preview if exists
    if (currentUserData?.avatar_url) {
        const preview = document.getElementById('profileAvatarPreview');
        preview.style.backgroundImage = `url(${currentUserData.avatar_url})`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.textContent = '';
    }

    modal.classList.add('active');
}

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Lütfen bir resim dosyası seçin!');
        return;
    }

    const btn = document.getElementById('changeAvatarBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `avatars/${currentUser.id}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('videos')
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from('videos')
            .getPublicUrl(fileName);

        // Update user profile
        const { error: updateError } = await supabaseClient
            .from('users')
            .update({ avatar_url: publicUrl })
            .eq('id', currentUser.id);

        if (updateError) throw updateError;

        // Update preview
        const preview = document.getElementById('profileAvatarPreview');
        preview.style.backgroundImage = `url(${publicUrl})`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.textContent = '';

        currentUserData.avatar_url = publicUrl;

        alert('Profil fotoğrafı güncellendi!');
    } catch (error) {
        alert('Profil fotoğrafı yüklenirken hata oluştu: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Profil Fotoğrafı Değiştir';
    }
}

// Leaderboard functions
async function loadLeaderboard() {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('video_count', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Leaderboard yüklenemedi:', error);
        return;
    }

    const grid = document.getElementById('leaderboardGrid');
    grid.innerHTML = '';

    if (data.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.5); padding: var(--spacing-lg);">Henüz kullanıcı yok. İlk içeriği yükleyen siz olun! 🎬</p>';
        return;
    }

    data.forEach((user, index) => {
        const card = document.createElement('div');
        card.className = 'user-card';

        const initial = user.username.charAt(0).toUpperCase();
        const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : '';

        const avatarStyle = user.avatar_url
            ? `background-image: url(${user.avatar_url}); background-size: cover; background-position: center;`
            : '';

        card.innerHTML = `
            <div class="user-avatar" style="${avatarStyle}">${user.avatar_url ? '' : initial}</div>
            <div class="user-info">
                <div class="user-name">${medal} ${user.username}</div>
                <div class="user-stats">${user.video_count} içerik</div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Load fake leaderboard for demo
function loadFakeLeaderboard() {
    const grid = document.getElementById('leaderboardGrid');
    grid.innerHTML = '';

    const fakeUsers = [
        { username: 'Ahmet Y.', videoCount: 15 },
        { username: 'Zeynep K.', videoCount: 12 },
        { username: 'Mehmet A.', videoCount: 10 },
        { username: 'Ayşe D.', videoCount: 8 },
        { username: 'Can S.', videoCount: 7 },
        { username: 'Ece M.', videoCount: 5 },
        { username: 'Burak T.', videoCount: 4 },
        { username: 'Deniz P.', videoCount: 3 }
    ];

    fakeUsers.forEach((user, index) => {
        const card = document.createElement('div');
        card.className = 'user-card';

        const initial = user.username.charAt(0).toUpperCase();
        const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : '';

        card.innerHTML = `
            <div class="user-avatar">${initial}</div>
            <div class="user-info">
                <div class="user-name">${medal} ${user.username}</div>
                <div class="user-stats">${user.videoCount} video</div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Upload functions
function showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.getElementById('uploadForm').reset();
    document.getElementById('selectedFileName').textContent = 'Dosya seçilmedi';
    selectedVideoFile = null;
}

async function handleUpload(e) {
    e.preventDefault();

    if (!selectedVideoFile) {
        alert('Lütfen bir video dosyası seçin!');
        return;
    }

    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;
    const submitBtn = document.getElementById('uploadSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Yükleniyor...';

    try {
        // Upload video to storage
        const fileExt = selectedVideoFile.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('videos')
            .upload(fileName, selectedVideoFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from('videos')
            .getPublicUrl(fileName);

        // Insert video metadata
        const { error: insertError } = await supabaseClient
            .from('videos')
            .insert([{
                user_id: currentUser.id,
                title: title,
                description: description,
                video_url: publicUrl,
                thumbnail_url: null
            }]);

        if (insertError) throw insertError;

        alert('Video başarıyla yüklendi!');
        closeUploadModal();
        await loadVideos();
        await loadLeaderboard();
    } catch (error) {
        alert('Video yüklenirken hata oluştu: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Yükle';
    }
}

// Video functions
async function loadVideos() {
    const { data, error } = await supabaseClient
        .from('videos')
        .select(`
            *,
            users (username)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Videolar yüklenemedi:', error);
        return;
    }

    const grid = document.getElementById('videosGrid');

    // Remove all video cards but keep upload card
    const uploadCard = document.getElementById('uploadCard');
    grid.innerHTML = '';
    grid.appendChild(uploadCard);

    // If no real videos, show empty message
    if (data.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.style.cssText = 'grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.5); padding: var(--spacing-xl);';
        emptyMessage.innerHTML = '<p style="font-size: 1.2rem; margin-bottom: var(--spacing-sm);">📹</p><p>Henüz video yok. İlk videoyu siz yükleyin!</p>';
        grid.appendChild(emptyMessage);
        return;
    }

    data.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';

        const date = new Date(video.created_at).toLocaleDateString('tr-TR');
        const isImage = video.video_url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);

        if (isImage) {
            // Image card
            card.innerHTML = `
                <div class="video-thumbnail-wrapper">
                    <img class="video-thumbnail" src="${video.video_url}" alt="${video.title}" style="object-fit: cover;">
                    <button class="play-button" onclick="event.stopPropagation(); showMedia(${JSON.stringify(video).replace(/"/g, '&quot;')})" style="font-size: 1rem;">🔍</button>
                </div>
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-meta">
                        <span class="video-author">${video.users?.username || 'Anonim'}</span>
                        <span>${date}</span>
                    </div>
                    ${video.description ? `<div class="video-description">${video.description}</div>` : ''}
                </div>
            `;
        } else {
            // Video card
            card.innerHTML = `
                <div class="video-thumbnail-wrapper">
                    <video class="video-thumbnail" src="${video.video_url}" preload="metadata"></video>
                    <button class="play-button" onclick="event.stopPropagation(); showMedia(${JSON.stringify(video).replace(/"/g, '&quot;')})">▶</button>
                </div>
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-meta">
                        <span class="video-author">${video.users?.username || 'Anonim'}</span>
                        <span>${date}</span>
                    </div>
                    ${video.description ? `<div class="video-description">${video.description}</div>` : ''}
                </div>
            `;
        }

        card.addEventListener('click', () => showCommentsSidebar(video));
        grid.appendChild(card);
    });
}

// Load fake videos for demo
function loadFakeVideos() {
    const grid = document.getElementById('videosGrid');
    const uploadCard = document.getElementById('uploadCard');

    // Clear grid but keep upload card
    grid.innerHTML = '';
    grid.appendChild(uploadCard);

    const fakeVideos = [
        {
            title: 'Muhteşem Gün Batımı',
            author: 'Ahmet Y.',
            date: '26.11.2024',
            description: 'İstanbul Boğazı\'nda çekilen harika bir gün batımı görüntüsü'
        },
        {
            title: 'Kedi Videosu 🐱',
            author: 'Zeynep K.',
            date: '25.11.2024',
            description: 'Sevimli kedicikler oynarken'
        },
        {
            title: 'Doğa Yürüyüşü',
            author: 'Mehmet A.',
            date: '24.11.2024',
            description: 'Karadeniz\'de harika bir doğa yürüyüşü'
        },
        {
            title: 'Yemek Tarifi',
            author: 'Ayşe D.',
            date: '23.11.2024',
            description: 'Pratik ve lezzetli bir makarna tarifi'
        },
        {
            title: 'Spor Antrenmanı',
            author: 'Can S.',
            date: '22.11.2024',
            description: 'Evde yapılabilecek 10 dakikalık antrenman'
        },
        {
            title: 'Gitar Dersi',
            author: 'Ece M.',
            date: '21.11.2024',
            description: 'Yeni başlayanlar için gitar dersi'
        },
        {
            title: 'Seyahat Vlogu',
            author: 'Burak T.',
            date: '20.11.2024',
            description: 'Kapadokya gezisi highlights'
        },
        {
            title: 'Oyun İncelemesi',
            author: 'Deniz P.',
            date: '19.11.2024',
            description: 'Yeni çıkan oyunun detaylı incelemesi'
        },
        {
            title: 'Dans Gösterisi',
            author: 'Selin Y.',
            date: '18.11.2024',
            description: 'Modern dans performansı'
        }
    ];

    fakeVideos.forEach((video, index) => {
        const card = document.createElement('div');
        card.className = 'video-card';

        // Create a colored placeholder instead of video
        const colors = ['#ff6b35', '#ff8c42', '#ffa566', '#e85d04', '#dc2f02'];
        const color = colors[index % colors.length];

        card.innerHTML = `
            <div class="video-thumbnail-wrapper">
                <div class="video-thumbnail" style="background: linear-gradient(135deg, ${color}, ${color}99); display: flex; align-items: center; justify-content: center; font-size: 2rem;">
                    🎬
                </div>
            </div>
            <div class="video-info">
                <div class="video-title">${video.title}</div>
                <div class="video-meta">
                    <span class="video-author">${video.author}</span>
                    <span>${video.date}</span>
                </div>
                <div class="video-description">${video.description}</div>
            </div>
        `;

        card.addEventListener('click', () => {
            showCommentsSidebar(video);
        });

        grid.appendChild(card);
    });
}

// Comments sidebar functions
let currentVideoForComments = null;

function showCommentsSidebar(video) {
    currentVideoForComments = video;
    const sidebar = document.getElementById('commentsSidebar');
    const title = document.getElementById('commentsVideoTitle');

    title.textContent = video.title;
    sidebar.classList.add('active');

    // Load real comments from database
    loadComments(video.id);
}

function closeCommentsSidebar() {
    const sidebar = document.getElementById('commentsSidebar');
    sidebar.classList.remove('active');
    currentVideoForComments = null;
}

async function loadComments(videoId) {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: var(--spacing-md);">Yorumlar yükleniyor...</p>';

    try {
        const { data, error } = await supabaseClient
            .from('comments')
            .select(`
                *,
                users (username, avatar_url)
            `)
            .eq('video_id', videoId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        commentsList.innerHTML = '';

        if (data.length === 0) {
            commentsList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: var(--spacing-lg);">Henüz yorum yok. İlk yorumu siz yapın! 💬</p>';
            return;
        }

        data.forEach(comment => {
            const commentItem = createCommentElement({
                username: comment.users?.username || 'Anonim',
                avatar_url: comment.users?.avatar_url,
                text: comment.text,
                time: getTimeAgo(comment.created_at)
            });
            commentsList.appendChild(commentItem);
        });
    } catch (error) {
        console.error('Yorumlar yüklenemedi:', error);
        commentsList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: var(--spacing-md);">Yorumlar yüklenemedi.</p>';
    }
}

function createCommentElement(comment) {
    const item = document.createElement('div');
    item.className = 'comment-item';

    const initial = comment.username.charAt(0).toUpperCase();
    const avatarStyle = comment.avatar_url
        ? `background-image: url(${comment.avatar_url}); background-size: cover; background-position: center;`
        : '';

    item.innerHTML = `
        <div class="comment-header">
            <div class="comment-user-avatar" style="${avatarStyle}">${comment.avatar_url ? '' : initial}</div>
            <div class="comment-user-info">
                <div class="comment-username">${comment.username}</div>
                <div class="comment-time">${comment.time}</div>
            </div>
        </div>
        <div class="comment-text">${comment.text}</div>
    `;

    return item;
}

async function handleSendComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();

    if (!text) return;

    if (!currentUser) {
        alert('Yorum yapmak için giriş yapmalısınız!');
        return;
    }

    if (!currentVideoForComments || !currentVideoForComments.id) {
        alert('Video bilgisi bulunamadı!');
        return;
    }

    try {
        // Save comment to database
        const { data, error } = await supabaseClient
            .from('comments')
            .insert([{
                video_id: currentVideoForComments.id,
                user_id: currentUser.id,
                text: text
            }])
            .select();

        if (error) throw error;

        // Clear input
        input.value = '';

        // Reload comments
        await loadComments(currentVideoForComments.id);
    } catch (error) {
        console.error('Yorum gönderilemedi:', error);
        alert('Yorum gönderilemedi: ' + error.message);
    }
}

// Helper function to convert timestamp to "X dakika önce" format
function getTimeAgo(timestamp) {
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffMs = now - commentTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return commentTime.toLocaleDateString('tr-TR');
}

function showMedia(video) {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayer');
    const title = document.getElementById('videoModalTitle');
    const info = document.getElementById('videoModalInfo');

    title.textContent = video.title;

    const isImage = video.video_url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);

    if (isImage) {
        // Show image
        player.style.display = 'none';
        let imageViewer = document.getElementById('imageViewer');
        if (!imageViewer) {
            imageViewer = document.createElement('img');
            imageViewer.id = 'imageViewer';
            imageViewer.style.cssText = 'width: 100%; max-width: 100%; height: auto; border-radius: var(--radius-md); margin-bottom: var(--spacing-md); cursor: zoom-in;';
            imageViewer.title = 'Büyütmek için tıklayın';

            // Add click to zoom functionality
            imageViewer.addEventListener('click', () => {
                const fullscreenDiv = document.createElement('div');
                fullscreenDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: zoom-out;';

                const fullscreenImg = document.createElement('img');
                fullscreenImg.src = imageViewer.src;
                fullscreenImg.style.cssText = 'max-width: 95%; max-height: 95%; object-fit: contain;';

                fullscreenDiv.appendChild(fullscreenImg);
                fullscreenDiv.addEventListener('click', () => fullscreenDiv.remove());
                document.body.appendChild(fullscreenDiv);
            });

            player.parentNode.insertBefore(imageViewer, player);
        }
        imageViewer.style.display = 'block';
        imageViewer.src = video.video_url;
        imageViewer.alt = video.title;
    } else {
        // Show video
        const imageViewer = document.getElementById('imageViewer');
        if (imageViewer) imageViewer.style.display = 'none';
        player.style.display = 'block';
        player.src = video.video_url;
    }

    const date = new Date(video.created_at).toLocaleDateString('tr-TR');
    info.innerHTML = `
        <p><strong>Yükleyen:</strong> ${video.users?.username || 'Anonim'}</p>
        <p><strong>Tarih:</strong> ${date}</p>
        ${video.description ? `<p><strong>Açıklama:</strong> ${video.description}</p>` : ''}
    `;

    modal.classList.add('active');
    if (!isImage) player.play();
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayer');
    const imageViewer = document.getElementById('imageViewer');

    player.pause();
    player.src = '';
    if (imageViewer) {
        imageViewer.src = '';
        imageViewer.style.display = 'none';
    }
    modal.classList.remove('active');
}

// Keep showVideo as alias for backward compatibility
const showVideo = showMedia;
