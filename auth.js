/**
 * ĐOÀN THƯỢNG BADMINTON - AUTHENTICATION & USER MANAGEMENT
 * Xử lý Đăng nhập, Đăng ký, Đổi mật khẩu, Phân quyền Admin / Học sinh
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.users = {};
    this.init();
  }

  init() {
    // 1. Khôi phục phiên đăng nhập từ localStorage
    const savedUser = localStorage.getItem('DT_CURRENT_USER');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }

    // 2. Lắng nghe cập nhật danh sách users từ Realtime Database
    window.realtimeDB.listen('users', (usersData) => {
      this.users = usersData || {};
      
      // Nếu user hiện tại đang đăng nhập, đồng bộ lại dữ liệu mới nhất (điểm, vai trò, ...)
      if (this.currentUser && this.users[this.currentUser.username]) {
        this.currentUser = this.users[this.currentUser.username];
        localStorage.setItem('DT_CURRENT_USER', JSON.stringify(this.currentUser));
      }
      
      this.updateAuthUI();
    });
  }

  // Đăng nhập
  async login(username, password) {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password; // Không trim khoảng trắng vì mật khẩu có thể có khoảng trắng như "minh 226899@"

    if (!cleanUsername || !cleanPassword) {
      throw new Error("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
    }

    const user = this.users[cleanUsername];
    if (!user) {
      throw new Error("Tài khoản không tồn tại trên hệ thống!");
    }

    if (user.password !== cleanPassword) {
      throw new Error("Mật khẩu không chính xác! Vui lòng kiểm tra lại.");
    }

    // Đăng nhập thành công
    this.currentUser = user;
    localStorage.setItem('DT_CURRENT_USER', JSON.stringify(user));
    
    // Cập nhật trạng thái online
    await window.realtimeDB.update(`users/${cleanUsername}`, {
      lastActive: new Date().toISOString(),
      isOnline: true
    });

    this.updateAuthUI();
    return user;
  }

  // Đăng ký tài khoản học sinh / thành viên
  async register(formData) {
    const username = formData.username.trim().toLowerCase();
    const password = formData.password;
    const fullName = formData.fullName.trim();
    const classGroup = formData.classGroup.trim();
    const gender = formData.gender; // 'nam' hoặc 'nu'
    const dominantHand = formData.dominantHand || 'Phải';

    if (!username || !password || !fullName || !classGroup) {
      throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc!");
    }

    if (username.length < 3) {
      throw new Error("Tên đăng nhập phải có ít nhất 3 ký tự!");
    }

    if (password.length < 4) {
      throw new Error("Mật khẩu phải có ít nhất 4 ký tự!");
    }

    if (this.users[username]) {
      throw new Error("Tên đăng nhập này đã được sử dụng! Vui lòng chọn tên khác.");
    }

    const newUser = {
      username: username,
      password: password,
      fullName: fullName,
      classGroup: classGroup,
      gender: gender,
      dominantHand: dominantHand,
      role: 'member',
      pointsMS: gender === 'nam' ? 1000 : 0,
      pointsWS: gender === 'nu' ? 1000 : 0,
      pointsMD: 0,
      pointsWD: 0,
      pointsXD: 0,
      avatar: "",
      createdAt: new Date().toISOString(),
      isOnline: true,
      lastActive: new Date().toISOString()
    };

    // Lưu vào database
    await window.realtimeDB.set(`users/${username}`, newUser);

    // Tự động đăng nhập
    this.currentUser = newUser;
    localStorage.setItem('DT_CURRENT_USER', JSON.stringify(newUser));
    this.updateAuthUI();

    return newUser;
  }

  // Đổi mật khẩu
  async changePassword(oldPassword, newPassword, confirmPassword) {
    if (!this.currentUser) {
      throw new Error("Bạn chưa đăng nhập!");
    }

    if (!newPassword || newPassword.length < 4) {
      throw new Error("Mật khẩu mới phải có ít nhất 4 ký tự!");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Xác nhận mật khẩu mới không trùng khớp!");
    }

    const username = this.currentUser.username;
    const userInDb = this.users[username];

    if (!userInDb || userInDb.password !== oldPassword) {
      throw new Error("Mật khẩu hiện tại không chính xác!");
    }

    // Cập nhật mật khẩu
    await window.realtimeDB.update(`users/${username}`, {
      password: newPassword
    });

    this.currentUser.password = newPassword;
    localStorage.setItem('DT_CURRENT_USER', JSON.stringify(this.currentUser));
    return true;
  }

  // Đăng xuất
  async logout() {
    if (this.currentUser) {
      const uname = this.currentUser.username;
      await window.realtimeDB.update(`users/${uname}`, {
        isOnline: false,
        lastActive: new Date().toISOString()
      });
    }
    this.currentUser = null;
    localStorage.removeItem('DT_CURRENT_USER');
    this.updateAuthUI();
  }

  // Kiểm tra quyền
  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  // Cập nhật giao diện thanh header theo trạng thái đăng nhập
  updateAuthUI() {
    const authLoggedOut = document.getElementById('auth-logged-out');
    const authLoggedIn = document.getElementById('auth-logged-in');
    const adminNavBtn = document.getElementById('nav-admin-btn');
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayRole = document.getElementById('user-display-role');
    const userAvatarSm = document.getElementById('user-avatar-sm');

    if (this.isLoggedIn()) {
      if (authLoggedOut) authLoggedOut.style.display = 'none';
      if (authLoggedIn) authLoggedIn.style.display = 'flex';
      
      if (userDisplayName) userDisplayName.textContent = this.currentUser.fullName || this.currentUser.username;
      if (userDisplayRole) {
        userDisplayRole.textContent = this.currentUser.role === 'admin' ? '🛡️ Admin BQT' : `🏸 Lớp ${this.currentUser.classGroup}`;
      }
      if (userAvatarSm) {
        userAvatarSm.textContent = (this.currentUser.fullName || this.currentUser.username).charAt(0).toUpperCase();
      }

      // Hiện nút Admin nếu là Admin
      if (adminNavBtn) {
        adminNavBtn.style.display = this.isAdmin() ? 'flex' : 'none';
      }
    } else {
      if (authLoggedOut) authLoggedOut.style.display = 'flex';
      if (authLoggedIn) authLoggedIn.style.display = 'none';
      if (adminNavBtn) adminNavBtn.style.display = 'none';
    }

    // Kích hoạt cập nhật giao diện các màn hình khác
    if (window.rankingManager) window.rankingManager.render();
    if (window.doublesManager) window.doublesManager.render();
    if (window.matchmakingManager) window.matchmakingManager.render();
  }
}

// Khởi tạo global instance
window.authManager = new AuthManager();
