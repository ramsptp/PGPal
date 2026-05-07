// ============================================================
// controllers.js — All AngularJS Controllers for PGPal
// ============================================================

var app = angular.module('pgpalApp');

// ── Auth Controller ──────────────────────────────────────────
app.controller('AuthCtrl', function($scope, $http, $location, AuthService) {

  $scope.loginData    = {};
  $scope.registerData = { preferences: { hobbies: [] }, roomPreferences: [] };
  $scope.errorMsg     = '';
  $scope.hobbyInput   = '';
  $scope.roomTypes    = ['Single', 'Double', 'Triple', 'Quad', '5-Sharing'];

  $scope.toggleRoomPref = function(type) {
    var idx = $scope.registerData.roomPreferences.indexOf(type);
    if (idx === -1) {
      $scope.registerData.roomPreferences.push(type);
    } else {
      $scope.registerData.roomPreferences.splice(idx, 1);
    }
  };

  $scope.addHobby = function() {
    var h = $scope.hobbyInput.trim();
    if (h && $scope.registerData.preferences.hobbies.indexOf(h) === -1) {
      $scope.registerData.preferences.hobbies.push(h);
    }
    $scope.hobbyInput = '';
  };

  $scope.removeHobby = function(index) {
    $scope.registerData.preferences.hobbies.splice(index, 1);
  };

  // POST /api/auth/login
  $scope.login = function() {
    $scope.errorMsg = '';
    $http.post('/api/auth/login', $scope.loginData)
      .then(function(res) {
        AuthService.saveToken(res.data.token, res.data.user);
        // Redirect based on role
        if (res.data.user.role === 'admin') {
          $location.path('/admin/dashboard');
        } else {
          $location.path('/tenant/dashboard');
        }
      })
      .catch(function(err) {
        $scope.errorMsg = err.data ? err.data.message : 'Login failed';
      });
  };

  // POST /api/auth/register
  $scope.register = function() {
    $scope.errorMsg = '';
    $http.post('/api/auth/register', $scope.registerData)
      .then(function() {
        $location.path('/login');
      })
      .catch(function(err) {
        $scope.errorMsg = err.data ? err.data.message : 'Registration failed';
      });
  };
});

// ── Admin Dashboard Controller ───────────────────────────────
app.controller('AdminDashCtrl', function($scope, $http) {
  $scope.stats = { total: 0, occupied: 0, vacant: 0 };
  $scope.recentMaintenance = [];

  // Fetch room statistics and recent maintenance requests in parallel
  $http.get('/api/rooms/stats')
    .then(function(res) { $scope.stats = res.data; });

  $http.get('/api/maintenance')
    .then(function(res) {
      // Show only the 5 most recent requests on the dashboard
      $scope.recentMaintenance = res.data.slice(0, 5);
    });
});

// ── Room Controller (Admin) ──────────────────────────────────
app.controller('RoomCtrl', function($scope, $http) {
  $scope.rooms      = [];
  $scope.newRoom    = { amenities: [] };
  $scope.amenityInput = '';
  $scope.editMode   = false;
  $scope.message    = '';

  // Fetch all rooms from the API
  function loadRooms() {
    $http.get('/api/rooms')
      .then(function(res) { $scope.rooms = res.data; });
  }
  loadRooms();

  $scope.addAmenity = function() {
    var a = $scope.amenityInput.trim();
    if (a) { $scope.newRoom.amenities.push(a); }
    $scope.amenityInput = '';
  };

  $scope.removeAmenity = function(i) { $scope.newRoom.amenities.splice(i, 1); };

  // POST /api/rooms — create new room
  $scope.saveRoom = function() {
    var request = $scope.editMode
      ? $http.put('/api/rooms/' + $scope.newRoom._id, $scope.newRoom)
      : $http.post('/api/rooms', $scope.newRoom);

    request.then(function() {
      $scope.message  = $scope.editMode ? 'Room updated!' : 'Room added!';
      $scope.newRoom  = { amenities: [] };
      $scope.editMode = false;
      loadRooms();
    }).catch(function(err) {
      $scope.message = err.data ? err.data.message : 'Error saving room';
    });
  };

  // Populate the form with existing room data for editing
  $scope.editRoom = function(room) {
    $scope.newRoom  = angular.copy(room);  // angular.copy prevents direct mutation
    $scope.editMode = true;
  };

  $scope.cancelEdit = function() {
    $scope.newRoom  = { amenities: [] };
    $scope.editMode = false;
  };

  // DELETE /api/rooms/:id
  $scope.deleteRoom = function(id) {
    if (!confirm('Delete this room?')) return;
    $http.delete('/api/rooms/' + id)
      .then(function() { loadRooms(); });
  };
});

// ── Tenant Admin Controller ──────────────────────────────────
app.controller('TenantAdminCtrl', function($scope, $http) {
  $scope.tenants = [];
  $scope.rooms   = [];
  $scope.message = '';

  function loadAll() {
    $http.get('/api/tenants').then(function(res) { $scope.tenants = res.data; });
    $http.get('/api/rooms').then(function(res)   { $scope.rooms   = res.data; });
  }
  loadAll();

  // PUT /api/tenants/:id/assign-room — roomId passed directly from the row's ng-model
  $scope.assignRoom = function(tenantId, roomId) {
    if (!roomId) { $scope.message = 'Please select a room first.'; return; }
    $http.put('/api/tenants/' + tenantId + '/assign-room', { roomId: roomId })
      .then(function() {
        $scope.message = 'Room assigned successfully!';
        loadAll();
      }).catch(function(err) {
        $scope.message = err.data ? err.data.message : 'Assignment failed';
      });
  };

  $scope.deleteTenant = function(id) {
    if (!confirm('Remove this tenant?')) return;
    $http.delete('/api/tenants/' + id).then(function() { loadAll(); });
  };
});

// ── Maintenance Admin Controller ─────────────────────────────
app.controller('MaintenanceAdminCtrl', function($scope, $http) {
  $scope.requests  = [];
  $scope.selected  = null;
  $scope.adminNote = '';
  $scope.newStatus = '';

  $http.get('/api/maintenance').then(function(res) { $scope.requests = res.data; });

  $scope.openRequest = function(req) {
    $scope.selected  = req;
    $scope.newStatus = req.status;
    $scope.adminNote = req.adminNote;
  };

  // PUT /api/maintenance/:id — update status and admin note
  $scope.updateStatus = function() {
    $http.put('/api/maintenance/' + $scope.selected._id, {
      status:    $scope.newStatus,
      adminNote: $scope.adminNote
    }).then(function(res) {
      // Update the local list item so the table reflects the change
      var idx = $scope.requests.findIndex(function(r) { return r._id === res.data._id; });
      if (idx !== -1) $scope.requests[idx] = res.data;
      $scope.selected = null;
    });
  };
});

// ── Notice Admin Controller ──────────────────────────────────
app.controller('NoticeAdminCtrl', function($scope, $http) {
  $scope.notices    = [];
  $scope.newNotice  = {};
  $scope.message    = '';

  function loadNotices() {
    $http.get('/api/notices').then(function(res) { $scope.notices = res.data; });
  }
  loadNotices();

  $scope.postNotice = function() {
    $http.post('/api/notices', $scope.newNotice)
      .then(function() {
        $scope.newNotice = {};
        $scope.message   = 'Notice posted!';
        loadNotices();
      });
  };

  $scope.deleteNotice = function(id) {
    $http.delete('/api/notices/' + id).then(function() { loadNotices(); });
  };
});

// ── Tenant Dashboard Controller ──────────────────────────────
app.controller('TenantDashCtrl', function($scope, $http) {
  $scope.profile = null;

  $http.get('/api/tenants/me').then(function(res) {
    $scope.profile = res.data;

    // Calculate next rent due date
    if (res.data.rentDueDay) {
      var today    = new Date();
      var dueDate  = new Date(today.getFullYear(), today.getMonth(), res.data.rentDueDay);
      if (dueDate < today) {
        dueDate.setMonth(dueDate.getMonth() + 1);  // Move to next month if already past
      }
      $scope.nextDueDate = dueDate.toDateString();
    }
  });
});

// ── Tenant Maintenance Controller ────────────────────────────
app.controller('MaintenanceTenantCtrl', function($scope, $http) {
  $scope.myRequests = [];
  $scope.newRequest = {};
  $scope.message    = '';
  $scope.profile    = null;

  // Load the tenant's profile to get their roomId for the request
  $http.get('/api/tenants/me').then(function(res) {
    $scope.profile = res.data;
  });

  $http.get('/api/maintenance').then(function(res) { $scope.myRequests = res.data; });

  $scope.submitRequest = function() {
    if (!$scope.profile || !$scope.profile.roomId) {
      $scope.message = 'You must be assigned to a room before filing a request.';
      return;
    }
    $scope.newRequest.roomId = $scope.profile.roomId._id;
    $http.post('/api/maintenance', $scope.newRequest)
      .then(function() {
        $scope.message    = 'Request submitted successfully!';
        $scope.newRequest = {};
        $http.get('/api/maintenance').then(function(res) { $scope.myRequests = res.data; });
      }).catch(function(err) {
        $scope.message = err.data ? err.data.message : 'Submission failed';
      });
  };
});

// ── Notice Board Controller (Tenant) ─────────────────────────
app.controller('NoticeCtrl', function($scope, $http) {
  $scope.notices = [];
  $http.get('/api/notices').then(function(res) { $scope.notices = res.data; });
});

// ── Roommate Matcher Controller ──────────────────────────────
app.controller('MatcherCtrl', function($scope, $http) {
  $scope.matches       = [];
  $scope.currentTenant = null;
  $scope.loading       = true;

  $http.get('/api/matcher')
    .then(function(res) {
      $scope.currentTenant = res.data.currentTenant;
      $scope.matches       = res.data.matches;
      $scope.loading       = false;
    })
    .catch(function() {
      $scope.loading = false;
    });

  // Returns a CSS class based on compatibility score
  $scope.scoreClass = function(score) {
    if (score >= 70) return 'badge-success';
    if (score >= 40) return 'badge-warning';
    return 'badge-danger';
  };
});
