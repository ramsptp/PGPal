// ============================================================
// controllers.js — All AngularJS Controllers for PGPal
// ============================================================

var app = angular.module('pgpalApp');

// ── Auth Controller ──────────────────────────────────────────
app.controller('AuthCtrl', function($scope, $http, $location, AuthService, Flash) {

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
  $scope.stats             = { total: 0, occupied: 0, vacant: 0 };
  $scope.tenantStats       = { total: 0, unassigned: 0 };
  $scope.pendingCount      = 0;
  $scope.monthlyRevenue    = 0;
  $scope.occupancyRate     = 0;
  $scope.recentMaintenance = [];
  $scope.recentTenants     = [];

  // Room stats + revenue
  $http.get('/api/rooms/stats').then(function(res) {
    $scope.stats = res.data;
  });

  // Full rooms list — compute revenue and bed-based occupancy
  $http.get('/api/rooms').then(function(res) {
    var rooms = res.data;

    // Revenue = price per person × number of people actually in the room
    $scope.monthlyRevenue = rooms.reduce(function(sum, r) {
      return sum + (r.pricePerMonth * r.occupiedBeds);
    }, 0);

    // Occupancy rate = occupied beds out of total bed capacity across all rooms
    var totalBeds    = rooms.reduce(function(sum, r) { return sum + r.capacity; }, 0);
    var occupiedBeds = rooms.reduce(function(sum, r) { return sum + r.occupiedBeds; }, 0);
    $scope.occupancyRate = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  });

  // Tenant stats — total and unassigned count
  $http.get('/api/tenants').then(function(res) {
    var tenants = res.data;
    $scope.tenantStats.total      = tenants.length;
    $scope.tenantStats.unassigned = tenants.filter(function(t) { return !t.roomId; }).length;
    // 5 most recently registered
    $scope.recentTenants = tenants.slice(0, 5);
  });

  // Maintenance — count pending and show 5 most recent
  $http.get('/api/maintenance').then(function(res) {
    var all = res.data;
    $scope.pendingCount      = all.filter(function(r) { return r.status === 'Pending'; }).length;
    $scope.recentMaintenance = all.slice(0, 5);
  });

  // Rent receipts — pending count + confirmed total this month
  $http.get('/api/rent').then(function(res) {
    var now   = new Date();
    var month = now.getMonth() + 1;
    var year  = now.getFullYear();
    $scope.pendingRent = res.data.filter(function(r) { return r.status === 'Pending'; }).length;
    $scope.confirmedRentThisMonth = res.data
      .filter(function(r) { return r.status === 'Confirmed' && r.month === month && r.year === year; })
      .reduce(function(sum, r) { return sum + r.amount; }, 0);
  });
});

// ── Room Controller (Admin) ──────────────────────────────────
app.controller('RoomCtrl', function($scope, $http, Flash) {
  $scope.rooms        = [];
  $scope.newRoom      = { amenities: [] };
  $scope.amenityInput = '';
  $scope.editMode     = false;
  $scope.roomSearch   = '';
  $scope.occupants    = [];
  $scope.selectedRoom = null;

  function loadRooms() {
    $http.get('/api/rooms').then(function(res) { $scope.rooms = res.data; });
  }
  loadRooms();

  $scope.viewOccupants = function(room) {
    $scope.selectedRoom = room;
    $scope.occupants    = [];
    $http.get('/api/rooms/' + room._id + '/occupants')
      .then(function(res) { $scope.occupants = res.data; });
  };

  $scope.closeOccupants = function() { $scope.selectedRoom = null; };

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
      Flash.set($scope.editMode ? 'Room updated!' : 'Room added!');
      $scope.newRoom  = { amenities: [] };
      $scope.editMode = false;
      loadRooms();
    }).catch(function(err) {
      Flash.set(err.data ? err.data.message : 'Error saving room', 'danger');
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

  $scope.deleteRoom = function(id) {
    if (!confirm('Delete this room?')) return;
    $http.delete('/api/rooms/' + id)
      .then(function() { Flash.set('Room deleted.'); loadRooms(); });
  };
});

// ── Tenant Admin Controller ──────────────────────────────────
app.controller('TenantAdminCtrl', function($scope, $http, Flash) {
  $scope.tenants       = [];
  $scope.rooms         = [];
  $scope.tenantSearch  = '';
  $scope.editingTenant = null;
  $scope.editForm      = {};
  $scope.today         = new Date();

  // Returns the next actual due date for a given day-of-month
  $scope.nextDueDate = function(day) {
    var today = new Date();
    var due   = new Date(today.getFullYear(), today.getMonth(), day);
    if (due <= today) due.setMonth(due.getMonth() + 1);
    return due;
  };

  function loadAll() {
    $http.get('/api/tenants').then(function(res) { $scope.tenants = res.data; });
    $http.get('/api/rooms').then(function(res)   { $scope.rooms   = res.data; });
  }
  loadAll();

  // PUT /api/tenants/:id/assign-room — roomId passed directly from the row's ng-model
  $scope.assignRoom = function(tenantId, roomId) {
    if (!roomId) { Flash.set('Please select a room first.', 'danger'); return; }
    $http.put('/api/tenants/' + tenantId + '/assign-room', { roomId: roomId })
      .then(function() { Flash.set('Room assigned successfully!'); loadAll(); })
      .catch(function(err) { Flash.set(err.data ? err.data.message : 'Assignment failed', 'danger'); });
  };

  $scope.vacateTenant = function(id) {
    if (!confirm('Move this tenant out of their room?')) return;
    $http.put('/api/tenants/' + id + '/vacate', {})
      .then(function() { Flash.set('Tenant vacated.'); loadAll(); })
      .catch(function(err) { Flash.set(err.data ? err.data.message : 'Failed', 'danger'); });
  };

  $scope.openEditTenant = function(tenant) {
    $scope.editingTenant = tenant._id;
    $scope.editForm = { name: tenant.name, phone: tenant.phone, rentDueDay: tenant.rentDueDay };
  };

  $scope.cancelEditTenant = function() { $scope.editingTenant = null; };

  $scope.saveEditTenant = function(id) {
    $http.put('/api/tenants/' + id + '/edit', $scope.editForm)
      .then(function(res) {
        var idx = $scope.tenants.findIndex(function(t) { return t._id === id; });
        if (idx !== -1) {
          $scope.tenants[idx].name       = res.data.name;
          $scope.tenants[idx].phone      = res.data.phone;
          $scope.tenants[idx].rentDueDay = res.data.rentDueDay;
        }
        $scope.editingTenant = null;
        Flash.set('Tenant updated!');
      }).catch(function(err) { Flash.set(err.data ? err.data.message : 'Update failed', 'danger'); });
  };

  $scope.deleteTenant = function(id) {
    if (!confirm('Permanently remove this tenant?')) return;
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
  $scope.profile        = null;
  $scope.notices        = [];
  $scope.myRequests     = [];
  $scope.openCount      = 0;
  $scope.daysUntilRent  = null;
  $scope.editingPrefs   = false;
  $scope.prefForm       = {};
  $scope.prefMessage    = '';
  $scope.roomTypes      = ['Single', 'Double', 'Triple', 'Quad', '5-Sharing'];
  $scope.hobbyInput     = '';
  $scope.editingProfile = false;
  $scope.profileForm    = {};
  $scope.profileMessage = '';

  $http.get('/api/tenants/me').then(function(res) {
    $scope.profile = res.data;
    if (res.data.rentDueDay) {
      var today   = new Date();
      var dueDate = new Date(today.getFullYear(), today.getMonth(), res.data.rentDueDay);
      if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1);
      $scope.nextDueDate   = dueDate.toDateString();
      $scope.daysUntilRent = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    }
  });

  $http.get('/api/notices').then(function(res) {
    $scope.notices = res.data.slice(0, 3);
  });

  $http.get('/api/maintenance').then(function(res) {
    $scope.myRequests = res.data;
    $scope.openCount  = res.data.filter(function(r) { return r.status !== 'Resolved'; }).length;
  });

  $http.get('/api/rent').then(function(res) {
    $scope.lastReceipt = res.data.length ? res.data[0] : null;
  });

  // Open the edit form pre-filled with current preferences
  $scope.openEditPrefs = function() {
    $scope.prefForm = {
      preferences:     angular.copy($scope.profile.preferences),
      roomPreferences: angular.copy($scope.profile.roomPreferences || [])
    };
    $scope.editingPrefs = true;
    $scope.prefMessage  = '';
  };

  $scope.cancelEditPrefs = function() {
    $scope.editingPrefs = false;
  };

  $scope.toggleRoomPref = function(type) {
    var idx = $scope.prefForm.roomPreferences.indexOf(type);
    if (idx === -1) { $scope.prefForm.roomPreferences.push(type); }
    else            { $scope.prefForm.roomPreferences.splice(idx, 1); }
  };

  $scope.addHobby = function() {
    var h = $scope.hobbyInput.trim();
    if (h && $scope.prefForm.preferences.hobbies.indexOf(h) === -1) {
      $scope.prefForm.preferences.hobbies.push(h);
    }
    $scope.hobbyInput = '';
  };

  $scope.removeHobby = function(i) { $scope.prefForm.preferences.hobbies.splice(i, 1); };

  // PUT /api/tenants/me/preferences
  $scope.savePrefs = function() {
    $http.put('/api/tenants/me/preferences', $scope.prefForm)
      .then(function(res) {
        $scope.profile.preferences     = res.data.preferences;
        $scope.profile.roomPreferences = res.data.roomPreferences;
        $scope.editingPrefs            = false;
        $scope.prefMessage             = 'Preferences saved!';
      })
      .catch(function(err) {
        $scope.prefMessage = err.data ? err.data.message : 'Save failed';
      });
  };

  // Profile edit
  $scope.openEditProfile = function() {
    $scope.profileForm    = { name: $scope.profile.name, phone: $scope.profile.phone };
    $scope.editingProfile = true;
    $scope.profileMessage = '';
  };

  $scope.cancelEditProfile = function() { $scope.editingProfile = false; };

  $scope.saveProfile = function() {
    $http.put('/api/tenants/me/profile', $scope.profileForm)
      .then(function(res) {
        $scope.profile.name   = res.data.name;
        $scope.profile.phone  = res.data.phone;
        $scope.editingProfile = false;
        $scope.profileMessage = 'Profile updated!';
      })
      .catch(function(err) {
        $scope.profileMessage = err.data ? err.data.message : 'Update failed';
      });
  };
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

// ── Rent Admin Controller ─────────────────────────────────────
app.controller('RentAdminCtrl', function($scope, $http) {
  $scope.receipts  = [];
  $scope.selected  = null;
  $scope.adminNote = '';
  $scope.newStatus = '';

  function load() {
    $http.get('/api/rent').then(function(res) { $scope.receipts = res.data; });
  }
  load();

  $scope.open = function(r) {
    $scope.selected  = r;
    $scope.newStatus = r.status;
    $scope.adminNote = r.adminNote || '';
  };

  $scope.updateReceipt = function() {
    $http.put('/api/rent/' + $scope.selected._id, {
      status: $scope.newStatus, adminNote: $scope.adminNote
    }).then(function(res) {
      var idx = $scope.receipts.findIndex(function(r) { return r._id === res.data._id; });
      if (idx !== -1) $scope.receipts[idx] = res.data;
      $scope.selected = null;
    });
  };

  $scope.statusClass = function(s) {
    return s === 'Confirmed' ? 'badge-success' : s === 'Rejected' ? 'badge-danger' : 'badge-warning';
  };
});

// ── Rent Tenant Controller ────────────────────────────────────
app.controller('RentTenantCtrl', function($scope, $http) {
  $scope.receipts   = [];
  $scope.newReceipt = { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  $scope.message    = '';
  $scope.profile    = null;
  $scope.months     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  $http.get('/api/tenants/me').then(function(res) { $scope.profile = res.data; });
  $http.get('/api/rent').then(function(res) { $scope.receipts = res.data; });

  $scope.submit = function() {
    $http.post('/api/rent', $scope.newReceipt)
      .then(function() {
        $scope.message    = 'Receipt submitted! Waiting for admin confirmation.';
        $scope.newReceipt = { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
        $http.get('/api/rent').then(function(res) { $scope.receipts = res.data; });
      }).catch(function(err) {
        $scope.message = err.data ? err.data.message : 'Submission failed';
      });
  };

  $scope.statusClass = function(s) {
    return s === 'Confirmed' ? 'badge-success' : s === 'Rejected' ? 'badge-danger' : 'badge-warning';
  };
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
