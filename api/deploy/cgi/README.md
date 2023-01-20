# CGI Deployment

CGI is one of the simplest deployment methods, and is suitable given the low expected frequency of requests.

1. Download and unzip `api.zip`. Ensure the `api` directory is web-accessible.

2. While in the `api` directory, create a virtual environment and enter it:

   ```
   python3 -m venv venv
   . venv/bin/activate
   ```

3. Install the requirements:

   ```
   pip install -r requirements.txt
   ```

4. Make `.htaccess` publicly readable and make `index.cgi` executable:

   ```
   chmod 644 .htaccess
   chmod 750 index.cgi
   ```

5. Create a file `users.txt` containing the names or IDs of all the users, one per line. These will be used when logging updates.

6. Set up the server with this command:

   ```
   flask --app src setup users.txt
   ```

   This command initialises the database and generates API keys for each user in `instance/config.py`.

7. Each user should do the following:

   - Go to the Settings page of the Ed Karma extension (Extension Icon > Settings)
   - Set the storage type for the course to Server
   - Enter the URL of the `api` directory in the Base URL field
   - Enter their API key in the API key field
   - Click Save and accept the additional permissions required by the extension if requested
