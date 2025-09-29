<h1>
  <img src="./src/admin-ui/frontend/img/cloudcompose/logo-128.png" alt="Logo" width="30" style="vertical-align: middle; margin-right: 5px;font-size:2rem;">
  CloudCompose
</h1>



CloudCompose is a platform designed to make running containerized open-source software effortless, even for non-technical users. With a single click, applications packaged in Docker containers can be deployed and managed without requiring in-depth IT knowledge.

Through its browser-based interface, administrators can easily launch or stop applications, manage users, and configure permissions. The primary goal of CloudCompose is to eliminate the need for technical expertise—even at the administrative level—while enabling quick and reliable deployment of any Docker-ready software.

At its core, CloudCompose operates a Node.js proxy that sits in front of all services to handle authentication and access management. Several preconfigured applications are already included, some with built-in user management where supported, making it simple to get started immediately.

Extending the platform with additional software is straightforward: new applications can be integrated by providing lightweight JavaScript-based integration scripts, with examples included for guidance.

> CloudCompose is currently in early beta (version 0.5.0). Feedback is welcome—whether it’s bug reports or feature suggestions—via the issues section of the project.


## Install

### Prerequisites
* Applications are accessed via subdomains in the format:
<application>-<tenant>.yourdomain.com
Ensure you have an entry in your /etc/hosts file pointing the relevant subdomains (or a wildcard) to your localhost IP address for local testing.

* For some applications, a valid wildcard SSL certificate for your domain is required. We recommend using Let’s Encrypt to obtain this certificate.

* Ports 80 (HTTP) and 443 (HTTPS) must be free on your machine, as CloudCompose uses HAProxy for reverse proxying on these ports.

### Installation Steps

#### Option 1: Quick Start with Provided Files

1) Download or copy the following files to your desired installation directory:
  * `docker-compose.yml`
  * `start.sh`

2) Open a terminal in that directory and make sure start.sh is executable:
    ```bash
    chmod +x start.sh  
    ```
3) Run the startup script:
    ```bash
    ./start.sh  
    ```

    This will pull necessary Docker images and start the CloudCompose stack.

#### Option 2: Full Source Clone with Build Capability

Using this method provides you full access to the source code and allows building Docker images locally for customization.


1) Clone the complete Git repository:

    ```bash
    git clone https://github.com/onebitahead/cloudcompose.git  
    cd cloudcompose 
    ```

2) Make the startup script executable:

    ```bash
      chmod +x start.sh  
    ```

3) Run the startup script to build images and start the system:

    ```bash
    ./start.sh  
    ```
    
#### Post Installation
Upon starting, the entrypoint script will automatically create a data directory next to the codebase to store persistent data and application configurations.

You can now access the CloudCompose browser UI and begin managing applications and users.