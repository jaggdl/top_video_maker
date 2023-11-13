\
README.md for Node JS Tier List Video Generator
=================================================

Overview
--------

This Node JS project provides a script (`index.js`) that generates a video of a tier list based on a given subject. The tier list video is customizable in terms of its subject and length. Additionally, there is an option to automatically upload the generated video to various platforms.

Features
--------

-   Generate a tier list video for any given subject.
-   Define the length of the tier list.
-   Option to upload the generated video.

Prerequisites
-------------

-   Node.js and npm installed.
-   Python and pip installed.
-   Required environment variables for the ML models APIs and uploading in the `.env` file (check `.env.example` file).

How to Use
----------

### 1\. Install Dependencies

First, navigate to the project directory and install the necessary dependencies:

`npm install`

### 2\. Run the Script

To generate a tier list video, use the following command:

`node index.js <LIST_LENGTH> <SUBJECT> <SHOULD_UPLOAD>`

Where:

-   `<LIST_LENGTH>`: The number of items in the tier list (e.g., `10`).
-   `<SUBJECT>`: The subject or theme of the tier list (e.g., `"Favorite Movies"`).
-   `<SHOULD_UPLOAD>`: Whether to upload the video or not (`true` or `false`).

Example:

`node index.js 10 "Best Movies of the 00's" true`

This will generate a tier list video of 10 best movies of the 2000's and will upload it to YouTube.

### 3\. Upload Configuration

To use the upload feature, ensure you have the necessary credentials and API keys set up in your environment. Currently, the script supports the following upload platforms:

-   General uploader (e.g., to your own server or cloud storage).
-   TikTok uploader (currently commented out in the script but can be enabled if desired).

You may need to adjust the uploaders' configurations based on your requirements.

Contributing
------------

If you'd like to contribute to this project, feel free to submit a pull request or open an issue for discussion.

License
-------

This project is licensed under the MIT License. See the `LICENSE` file for more details.