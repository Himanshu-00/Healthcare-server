# Healthcare Server

A Node.js server application that integrates the Gemini API for health analysis. The server allows users to get and post data to analyze health-related images and provides text responses.

## Features

- **Gemini API Integration**: Access health-related services through the Gemini API.
- **Image Analysis**: Analyze health-related images and receive text responses.
- **Express.js Framework**: Built with Express.js for a robust and scalable server architecture.
- **Docker Support**: Implemented Docker and Docker Compose for easy deployment and management.


## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Himanshu-00/Healthcare-server.git
   cd Healthcare-server
   
2. Install all required dependencies:

   ```bash
   npm install
   docker-compose up --build
   

## Usage

Once the server is running, you can access the API at http://localhost:PORT (replace PORT with the port specified in your docker-compose.yml file).

## API Endpoints

POST /api/analyze: Upload an image for analysis.
GET /api/status: Check the server status.
Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
