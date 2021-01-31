import axios from "axios";
export default class RegistrationForm {
  constructor() {
    // create a property that grabs the CSRF value fron one of the hidden input on the page
    this._csrf = document.querySelector('[name="_csrf"]').value;
    this.form = document.querySelector("#registration-form");
    this.allFields = document.querySelectorAll("#registration-form .form-control");
    this.insertValidationElements();
    this.username = document.querySelector("#username-register");
    this.username.previousValue = "";

    this.email = document.querySelector("#email-register");
    this.email.previousValue = "";

    this.password = document.querySelector("#password-register");
    this.password.previousValue = "";

    this.username.isUnique = false;
    this.email.isUnique = false;
    this.events();
  }

  // Events
  events() {
    // overall form
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.formSubmitHandler();
    });
    // username field
    this.username.addEventListener("keyup", () => {
      this.isDifferrent(this.username, this.usernameHandler);
    });
    // email field
    this.email.addEventListener("keyup", () => {
      this.isDifferrent(this.email, this.emailHandler);
    });
    // password field
    this.password.addEventListener("keyup", () => {
      this.isDifferrent(this.password, this.passwordHandler);
    });

    // Blur Events
    this.username.addEventListener("blur", () => {
      this.isDifferrent(this.username, this.usernameHandler);
    });

    this.email.addEventListener("blur", () => {
      this.isDifferrent(this.email, this.emailHandler);
    });

    this.password.addEventListener("blur", () => {
      this.isDifferrent(this.password, this.passwordHandler);
    });
  }

  // Methods

  formSubmitHandler() {
    // manually run all validation checks
    this.usernameImmediately();
    this.usernameAfterDelay();
    this.emailAfterDelay();
    this.passwordImmediately();
    this.passwordAfterDelay();

    if (this.username.isUnique && !this.username.errors && this.email.isUnique && !this.email.errors && !this.password.errors) {
      this.form.submit();
    }
  }

  isDifferrent(el, handler) {
    if (el.previousValue != el.value) {
      handler.call(this);
    }
    el.previousValue = el.value;
  }

  usernameHandler() {
    this.username.errors = false;
    this.usernameImmediately();
    clearTimeout(this.username.timer);
    this.username.timer = setTimeout(() => this.usernameAfterDelay(), 800);
  }

  passwordHandler() {
    // alert("Username hadnler jus ran!");
    this.password.errors = false;
    this.passwordImmediately();
    clearTimeout(this.password.timer);
    this.password.timer = setTimeout(() => this.passwordAfterDelay(), 800);
  }

  passwordImmediately() {
    if (this.password.value.length > 50) {
      this.showValidationError(this.password, "Password cannot exceed 50 characters");
    }

    if (!this.password.errors) {
      this.hideValidationError(this.password);
    }
  }

  passwordAfterDelay() {
    if (this.password.value.length < 12) {
      this.showValidationError(this.password, "Password must be atleast 12 characters");
    }
  }

  emailHandler() {
    // alert("Username hadnler jus ran!");
    this.email.errors = false;
    clearTimeout(this.email.timer);
    this.email.timer = setTimeout(() => this.emailAfterDelay(), 800);
  }

  emailAfterDelay() {
    // check if the format look nothing like email address or not like email address
    if (!/^\S+@\S+$/.test(this.email.value)) {
      this.showValidationError(this.email, "You must provide a valid email address");
    }

    if (!this.email.errors) {
      axios
        .post("/doesEmailExist", { _csrf: this._csrf, email: this.email.value })
        .then((response) => {
          if (response.data) {
            this.email.isUnique = false;
            this.showValidationError(this.email, "That email is already being used");
          } else {
            this.email.isUnique = true;
            this.hideValidationError(this.email);
          }
        })
        .catch(() => {
          console.log("Please try again later");
        });
    }
  }

  usernameImmediately() {
    if (this.username.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)) {
      this.showValidationError(this.username, "Username can only contain letters and numbers");
    }

    // checking for 30 char long
    if (this.username.value.length > 30) {
      this.showValidationError(this.username, "Username cannot exceed 30 characters");
    }

    if (!this.username.errors) {
      this.hideValidationError(this.username);
    }
  }

  hideValidationError(el) {
    el.nextElementSibling.classList.remove("liveValidateMessage--visible");
  }

  showValidationError(el, message) {
    el.nextElementSibling.innerHTML = message;
    el.nextElementSibling.classList.add("liveValidateMessage--visible");
    el.errors = true;
  }

  usernameAfterDelay() {
    if (this.username.value.length < 3) {
      this.showValidationError(this.username, "Username must be atleast 3 characters");
    }

    // checking if the usesrname exist.
    if (!this.username.errors) {
      axios
        .post("/doesUsernameExist", { _csrf: this._csrf, username: this.username.value })
        .then((response) => {
          if (response.data) {
            this.showValidationError(this.username, "That username is already taken");
            this.username.isUnique = false;
          } else {
            this.username.isUnique = true;
          }
        })
        .catch(() => {
          console.log("Please try again later");
        });
    }
  }

  insertValidationElements() {
    this.allFields.forEach(function (el) {
      el.insertAdjacentHTML("afterend", '<div class="alert alert-danger small p-2 liveValidateMessage"></div>');
    });
  }
}
