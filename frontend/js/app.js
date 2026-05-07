// ============================================================
// app.js — AngularJS 1.x Application Bootstrap
// ============================================================
// Defines the main module, configures client-side routing
// using $routeProvider, and sets up a global auth factory.
// ============================================================

var app = angular.module('pgpalApp', ['ngRoute']);

// ── Route Configuration ──────────────────────────────────────
app.config(function($routeProvider, $locationProvider) {

  // Use hash-based URLs (e.g. /#/dashboard) so Express doesn't intercept them
  $locationProvider.hashPrefix('!');

  $routeProvider

    // ── Auth Routes ──────────────────────────────────────────
    .when('/login', {
      templateUrl: 'views/login.html',
      controller:  'AuthCtrl'
    })
    .when('/register', {
      templateUrl: 'views/register.html',
      controller:  'AuthCtrl'
    })

    // ── Admin Routes ─────────────────────────────────────────
    .when('/admin/dashboard', {
      templateUrl: 'views/admin/dashboard.html',
      controller:  'AdminDashCtrl'
    })
    .when('/admin/rooms', {
      templateUrl: 'views/admin/rooms.html',
      controller:  'RoomCtrl'
    })
    .when('/admin/tenants', {
      templateUrl: 'views/admin/tenants.html',
      controller:  'TenantAdminCtrl'
    })
    .when('/admin/maintenance', {
      templateUrl: 'views/admin/maintenance.html',
      controller:  'MaintenanceAdminCtrl'
    })
    .when('/admin/notices', {
      templateUrl: 'views/admin/notices.html',
      controller:  'NoticeAdminCtrl'
    })

    // ── Tenant Routes ────────────────────────────────────────
    .when('/tenant/dashboard', {
      templateUrl: 'views/tenant/dashboard.html',
      controller:  'TenantDashCtrl'
    })
    .when('/tenant/maintenance', {
      templateUrl: 'views/tenant/maintenance.html',
      controller:  'MaintenanceTenantCtrl'
    })
    .when('/tenant/notices', {
      templateUrl: 'views/tenant/notices.html',
      controller:  'NoticeCtrl'
    })
    .when('/tenant/matcher', {
      templateUrl: 'views/tenant/matcher.html',
      controller:  'MatcherCtrl'
    })

    // ── Default redirect ─────────────────────────────────────
    .otherwise({ redirectTo: '/login' });
});

// ── Auth Factory — Manages JWT token storage ─────────────────
app.factory('AuthService', function($window) {
  return {
    // Save token and user object to localStorage after login
    saveToken: function(token, user) {
      $window.localStorage.setItem('pgpal_token', token);
      $window.localStorage.setItem('pgpal_user',  JSON.stringify(user));
    },

    getToken: function() {
      return $window.localStorage.getItem('pgpal_token');
    },

    getUser: function() {
      var u = $window.localStorage.getItem('pgpal_user');
      return u ? JSON.parse(u) : null;
    },

    isLoggedIn: function() {
      return !!$window.localStorage.getItem('pgpal_token');
    },

    logout: function() {
      $window.localStorage.removeItem('pgpal_token');
      $window.localStorage.removeItem('pgpal_user');
    }
  };
});

// ── HTTP Interceptor — Attaches JWT to every API request ─────
app.factory('AuthInterceptor', function(AuthService) {
  return {
    request: function(config) {
      var token = AuthService.getToken();
      if (token) {
        config.headers['Authorization'] = 'Bearer ' + token;
      }
      return config;
    }
  };
});

app.config(function($httpProvider) {
  $httpProvider.interceptors.push('AuthInterceptor');
});

// ── Root Controller — Handles navbar and global state ────────
app.controller('AppCtrl', function($scope, $location, $window, AuthService) {
  $scope.isLoggedIn  = AuthService.isLoggedIn;
  $scope.currentUser = AuthService.getUser();

  // Restore dark mode preference across sessions
  $scope.darkMode = $window.localStorage.getItem('pgpal_dark') === 'true';
  if ($scope.darkMode) { $window.document.body.classList.add('dark-mode'); }

  $scope.toggleDark = function() {
    $scope.darkMode = !$scope.darkMode;
    $window.document.body.classList.toggle('dark-mode', $scope.darkMode);
    $window.localStorage.setItem('pgpal_dark', $scope.darkMode);
  };

  $scope.logout = function() {
    AuthService.logout();
    $location.path('/login');
  };

  $scope.isAdmin = function() {
    var user = AuthService.getUser();
    return user && user.role === 'admin';
  };
});
