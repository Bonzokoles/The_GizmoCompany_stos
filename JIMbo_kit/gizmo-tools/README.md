# Gizmo Tools

Gizmo Tools is a collection of utility scripts designed to streamline various tasks and enhance productivity. This project includes several modules that provide essential functionalities for running scripts, logging information, and handling errors.

## Project Structure

```
gizmo-tools
├── tools
│   ├── scripts
│   │   └── index.ts        # Contains tool scripts and exports the runScripts function.
│   ├── shared
│   │   └── index.ts        # Exports helper functions like log and errorHandler.
│   └── types
│       └── index.ts        # Exports interfaces such as ScriptOptions and SharedData.
├── package.json             # npm configuration file with dependencies and scripts.
├── tsconfig.json            # TypeScript configuration file specifying compiler options.
└── README.md                # Documentation for installation and usage instructions.
```

## Installation

To install the necessary dependencies, run the following command:

```
npm install
```

## Usage

To run the scripts, you can use the following command:

```
npm run <script-name>
```

Replace `<script-name>` with the name of the script you wish to execute.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.