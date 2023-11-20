import {
  LegacyCard,
  Text,
  Button,
  Modal,
  Spinner,
  ProgressBar,
} from "@shopify/polaris";
import { Toast } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";
import * as XLSX from "xlsx";
import "./ProductCard.css";
import { useLocation, useNavigate } from "react-router-dom";
export function ProductsCard() {
  const [isLoadingExcelSheet, setIsLoadingExcelSheet] = useState(false);
  const [ExcelData, setExcelData] = useState({});
  const [isResendEmailLoading, setResendEmailLoading] = useState(false);
  const [IsResendEmail, setIsResendEmail] = useState(false);
  const [emailResendData, setEmailResendData] = useState({});
  const [responseData, setResponseData] = useState([]);
  const [totalResponseData, setTotalResponseData] = useState([]);
  const fetch = useAuthenticatedFetch();
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const fileInputRef = React.createRef();
  const [isEmailModalOpen, setEmailModalOpen] = useState(false);
  const [duplicateValues, setduplicateValues] = useState([]);
  const [isDuplicateValuesModalOpen, setIsDuplicateValuesModalOpen] = useState(
    false
  );
  const [editedEmail, setEditedEmail] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedOrderID, setSelectedOrderID] = useState("");
  const [isProgressBarVisible, setProgressBarVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const [currentPage, setCurrentPage] = useState(
    parseInt(queryParams.get("page")) || 1
  );
  const [selectedPageDropdown, setSelectedPageDropdown] = useState(currentPage);
  const [isPrevPageLoading, setIsPrevPageLoading] = useState(false);
  const [isNextPageLoading, setIsNextPageLoading] = useState(false);
  const itemsPerPage = 10;

  let totalItems, totalPages;

  const updateProgressBar = (value) => {
    setProgress(value);
    if (value > 99) {
      setProgress(0);
      console.log(progress, ">>>>>>>>>>>>>>>>>..pr>>>>>>>>>>>>>>>>");
      setProgressBarVisible(false);
    }
    if (Number.isNaN(value) == true) {
      setProgressBarVisible(false);
    }
  };

  const fetchData = async (page) => {
    await fetch("/api/createDb");
    try {
      setResponseData([]);
      const response = await fetch(`/api/getDataPagination?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        const respons = data.data;
        setIsPrevPageLoading(false);
        setIsNextPageLoading(false);
        if (respons) {
          setResponseData(respons);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    try {
      const responseTotal = await fetch("/api/getData");
      if (responseTotal.ok) {
        const dataTotal = await responseTotal.json();
        const responsTotal = dataTotal.data;
        setTotalResponseData(responsTotal);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    // await fetch("/api/products/create");
  };

  if (totalResponseData) {
    totalItems = totalResponseData.length;
    totalPages = Math.ceil(totalItems / itemsPerPage);
  }
  useEffect(() => {
    fetchData(currentPage);
    const pageFromRoute = parseInt(queryParams.get("page")) || 1;
    setCurrentPage(pageFromRoute);
    setSelectedPageDropdown(pageFromRoute);
  }, [selectedPageDropdown,location.search]);

  const nextPage = () => {
    const nextPageNumber = currentPage + 1;
    setSelectedPageDropdown(nextPageNumber);
    navigate(`?page=${nextPageNumber}`);
    setCurrentPage(nextPageNumber);
    setIsNextPageLoading(true);
  };

  const previousPage = () => {
    if (currentPage > 1) {
      const previousPageNumber = currentPage - 1;
      setSelectedPageDropdown(previousPageNumber);
      navigate(`?page=${previousPageNumber}`);
      setCurrentPage(previousPageNumber);
      setIsPrevPageLoading(true);
    }
  };

  // function to resend mail for the used esims
  const handleResendMail = async () => {
    setResendEmailLoading(true);
    try {
      const OrderDataresponse = await fetch(
        `/api/getDataByOrderId?OrderID=${selectedOrderID}`
      );
      const data = await OrderDataresponse.json();
      const iccidsToSend = data.ESIM_ICCDI;
      const bundleNamesToSend = data.DATA_BUNDLE_NAME;
      const urlsToSend = data.ESIM_URL;
      const payload = {
        mail: editedEmail,
        iccid: iccidsToSend,
        bundle_name: bundleNamesToSend,
        esim_url: urlsToSend,
        order_id: selectedOrderID,
      };
      const response = await fetch("/api/resendMail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      await response.json();
      if (!response.ok) {
        throw new Error("Network response was not ok.");
      } else {
        setEmailModalOpen(false);
        setEmailResendData({ content: "Mail Sent Successfully" });
        setIsResendEmail(true);
      }
    } catch (error) {
      setEmailResendData({ content: "Mail Not Sent" });
      setIsResendEmail(false);
      console.error("Error making POST request:", error);
    } finally {
      setResendEmailLoading(false);
    }
  };

  // import excel sheet and hit api to store all data in database
  const parseExcelData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const parsedData = [];
      reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(worksheet["!ref"]);
        const numRows = range.e.r + 1;
        const numCols = range.e.c + 1;
        for (let row = 1; row < numRows; row++) {
          const rowData = {};
          for (let col = 0; col < numCols; col++) {
            const cellReference = XLSX.utils.encode_cell({ r: row, c: col });
            const cellValue = worksheet[cellReference]?.v;
            const columnHeader =
              worksheet[XLSX.utils.encode_cell({ r: 0, c: col })]?.v;
            rowData[columnHeader] = cellValue;
          }
          parsedData.push(rowData);
        }
        resolve(parsedData);
      };
      reader.onerror = function (error) {
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  //
  const handleImportExcel = async (event) => {
    let progress = 0;
    updateProgressBar(progress);
    const DuplicateIccdiValues = [];
    let error = "error";
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const allowedExtensions = ["xlsx", "xls"];
      const fileExtension = selectedFile.name.split(".").pop().toLowerCase();
      if (allowedExtensions.includes(fileExtension)) {
        event.target.value = null;
        try {
          const parsedData = await parseExcelData(selectedFile);
          const chunkSize = 500;
          const chunks = [];
          let currentChunkIndex = 0;
          for (let i = 0; i < parsedData.length; i += chunkSize) {
            chunks.push(parsedData.slice(i, i + chunkSize));
          }

          const requiredColumns = ["ICCID", "ESIM_URL"];
          const firstRow = parsedData[0];
          const missingColumns = requiredColumns.filter(
            (col) => !firstRow[col]
          );
          let responseData = [];
          if (missingColumns.length === 0) {
            setProgressBarVisible(true);
            for (let index = 0; index < chunks.length; index++) {
              try{
                const response = await fetch("/api/saveExcelData", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ parsedData: chunks[index] }),
                });
                if (response) {
                  const data = await response.json();
                  const respons = data.data;
                  if (data) {
                    responseData.push(respons);
                    let totalChunks = chunks.length - 1;
                    const progress = Math.round((index / totalChunks) * 100);
                    updateProgressBar(progress);
                  }
                } else {
                  setExcelData({ content: "Error while importing data" });
                  setProgressBarVisible(false);
                }
              }catch(e){
                setExcelData({ content: "Error while importing data" });
                setProgressBarVisible(false);
              }
            }
            let data = [];
            console.log(responseData.length, ">>>>>>responseData>>>>>>>");
            if (responseData.length > 0) {
              for (let i = 0; i < responseData.length; i++) {
                if (responseData[i]) {
                  for (let j = 0; j < responseData[i].length; j++) {
                    data.push(responseData[i][j]);
                  }
                }
              }
              for (let elememt of parsedData) {
                let matchingVariant = data.find((extractedDataItem) => {
                  return extractedDataItem === elememt.ICCID;
                });
                if (matchingVariant) {
                  const isDuplicate = DuplicateIccdiValues.some(
                    (item) => item.matchingVariant === matchingVariant
                  );
                  if (!isDuplicate) {
                    DuplicateIccdiValues.push({ matchingVariant });
                  }
                } else {
                  setExcelData({ content: "Data Imported Succesfully" });
                  setIsLoadingExcelSheet(true);
                }
              }
              if (DuplicateIccdiValues.length !== 0) {
                OpenDuplicateValuesModal(DuplicateIccdiValues);
              } else {
                setProgressBarVisible(false);
                window.location.reload();
              }
            }
          } else {
            setExcelData({
              content: `Missing required columns: ${missingColumns.join(
                ", "
              )}. Please select an Excel file with these columns.`,
            });
            setIsLoadingExcelSheet(true);
            setProgressBarVisible(false);
          }
        } catch (error) {
          setExcelData({ content: "Error while importing data" });
          setProgressBarVisible(false);
          console.error("An error occurred:", error);
        }
      }
    }
  };

  //
  const handleImportButtonClick = () => {
    fileInputRef.current.click();
  };

  // open modal function
  const openModal = (email, order_id) => {
    setSelectedEmail(email);
    setEditedEmail(email);
    setSelectedOrderID(order_id);
    setEmailModalOpen(true);
  };

  // close modal function
  const closeModal = () => {
    setEmailModalOpen(false);
  };

  const OpenDuplicateValuesModal = (response) => {
    setIsDuplicateValuesModalOpen(true);
    setduplicateValues(response);
  };

  const closeDuplicateValuesModal = () => {
    setIsDuplicateValuesModalOpen(false);
    window.location.reload();
  };

  const handleEmailChange = (e) => {
    setEditedEmail(e.target.value);
  };

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  const handlePageChange = (e) => {
    const newPage = parseInt(e.target.value, 10);
    setCurrentPage(newPage);
    setSelectedPageDropdown(newPage);
    navigate(`?page=${newPage}`);
  };

  const groupedData = {};
  if (responseData) {
    for (let item of responseData) {
      const orderID = item.ORDER_ID;
      if (orderID !== null) {
        if (!groupedData[orderID]) {
          groupedData[orderID] = {
            rows: [],
            showButton: false,
            customerEmail:item.CUSTOMER_EMAIL,
            esimStatus: item.ESIM_STATUS,
            ORDER_CREATE_TIME:item.ORDER_CREATE_TIME,
          };
        }
        groupedData[orderID].rows.push(item);
        if (item.ESIM_STATUS === "USED") {
          groupedData[orderID].showButton = true;
        }
      }
    }
  }

  return (
    <>
      {isLoadingExcelSheet && (
        <Toast {...ExcelData} onDismiss={() => setIsLoadingExcelSheet(false)} />
      )}
      {IsResendEmail && (
        <Toast {...emailResendData} onDismiss={() => setIsResendEmail(false)} />
      )}

      <LegacyCard sectioned>
        {/* heading */}
        <div className="heading_outer">
          <h2>ORDER DETAILS</h2>
          <p>
            Jump to Page
            <span>
              <select
                value={selectedPageDropdown}
                onChange={handlePageChange}
                style={{ width: "80px", textAlign:"center", margin: "0 10px" }}
              >
                {pageNumbers.map((pageNumber) => (
                  <option key={pageNumber} value={pageNumber}>
                    {pageNumber}
                  </option>
                ))}
              </select>
            </span>
            Page {currentPage} of {totalPages}
          </p>
        </div>

        {/* total stock details */}
        <div className="total">
          <p style={{ fontSize: "16px", marginTop: "10px", marginLeft: "4px" }}>
            {totalResponseData && totalResponseData.length > 0 ? (
              <>Total Stock: {totalResponseData.length}</>
            ): (<>Total Stock:0</>)}
          </p>
          <Text>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
            />
          </Text>
          <Button onClick={handleImportButtonClick}>IMPORT EXCEL SHEET</Button>
        </div>

        {/* table to show all data */}
        <table>
          <thead>
            {!isEmailModalOpen && (
              <tr>
                <th>ORDER ID</th>
                <th>CUSTOMER EMAIL</th>
                <th>ESIM STATUS</th>
                <th>ORDER CREATED TIME</th>
                <th>ESIM ICCID</th>
                <th>DATA BUNDLE</th>
                <th>MERCHANT PRICE</th>
                <th>COST PRICE</th>
                {responseData.map((item) => {
                  <th key={item.ESIM_ICCDI}>{item.ESIM_ICCDI}</th>;
                })}
              </tr>
            )}
          </thead>

          <tbody>
            {responseData.reduce((uniqueRows, item) => {
              if (item.ORDER_ID === null) {
                return uniqueRows.concat(
                  <tr key={item.DATA_BUNDLE_ID} className="details_outer">
                    <td className="details_inner">
                      <Text>{item.ORDER_ID}</Text>
                    </td>
                    <td className="details_inner">
                      <Text>{item.CUSTOMER_EMAIL}</Text>
                    </td>
                    <td className="details_inner">
                      <Text>{item.ESIM_STATUS}</Text>
                    </td>
                    <td className="details_inner">
                      <Text>{item.ORDER_CREATE_TIME}</Text>
                    </td>
                    <td className="details_inner">
                      <Text>{item.ESIM_ICCDI}</Text>
                    </td>
                    <td className="details_inner">
                      <Text> {item.DATA_BUNDLE_NAME}</Text>
                    </td>
                    <td className="details_inner">
                      <Text> {item.MERCHANT_PRICE}</Text>
                    </td>
                    <td className="details_inner">
                      <Text> {item.COST_PRICE}</Text>
                    </td>
                    {item.ESIM_STATUS === "USED" ? (
                      <td className="details_inner">
                        <Text>
                          <Button
                            onClick={() =>
                              openModal(item.CUSTOMER_EMAIL, item.ORDER_ID)
                            }
                          >
                            RESEND MAIL
                          </Button>
                        </Text>
                      </td>
                    ) : null}
                  </tr>
                );
              } else if (!uniqueRows.some((row) => row.key === item.ORDER_ID)) {
                // Grouped data when ORDER ID is not null
                const groupData = groupedData[item.ORDER_ID];
                if (groupData && groupData.rows.length > 0) {
                  return uniqueRows.concat(
                    <tr key={item.ORDER_ID} className="details_outer">
                      <td className="details_inner">
                        <Text>{item.ORDER_ID}</Text>
                      </td>
                      <td className="details_inner">
                        <Text>{groupData.customerEmail}</Text>
                      </td>
                      <td className="details_inner">
                        <Text>{groupData.esimStatus}</Text>
                      </td>
                      <td className="details_inner">
                        <Text>{groupData.ORDER_CREATE_TIME}</Text>
                      </td>

                      {/* Display ESIM_ICCDI names together */}
                      <td className="details_inner">
                        <div className="details">
                          {groupData.rows.map((row, index) => (
                            <h6 key={`${row.ESIM_ICCDI}_${index}`}>
                              {row.ESIM_ICCDI}
                              {index < groupData.rows.length - 1 && <br />}
                            </h6>
                          ))}
                        </div>
                      </td>
                      {/* Display data bundle names together */}
                      <td className="details_inner">
                        <div className="details">
                          {groupData.rows.map((row, index) => (
                            <h6 key={`${row.DATA_BUNDLE_NAME}_${index}`}>
                              {row.DATA_BUNDLE_NAME}
                              {index < groupData.rows.length - 1 && <br />}
                            </h6>
                          ))}
                        </div>
                      </td>

                      {/* Display MERCHANT_PRICE names together */}
                      <td className="details_inner">
                        <div className="details">
                          {groupData.rows.map((row, index) => (
                            <h6 key={`${row.MERCHANT_PRICE}_${index}`}>
                              {row.MERCHANT_PRICE}
                              {index < groupData.rows.length - 1 && <br />}
                            </h6>
                          ))}
                        </div>
                      </td>

                      {/* Display COST_PRICE names together */}
                      <td className="details_inner">
                        <div className="details">
                          {groupData.rows.map((row, index) => (
                            <h6 key={`${row.COST_PRICE}_${index}`}>
                              {row.COST_PRICE}
                              {index < groupData.rows.length - 1 && <br />}
                            </h6>
                          ))}
                        </div>
                      </td>
                      {groupData.showButton && (
                        <td className="details_inner">
                          <Text>
                            <Button
                              onClick={() =>
                                openModal(
                                  groupData.customerEmail,
                                  groupData.rows[0].ORDER_ID
                                )
                              }
                            >
                              RESEND MAIL
                            </Button>
                          </Text>
                        </td>
                      )}
                    </tr>
                  );
                }
              }
              return uniqueRows;
            }, [])}
          </tbody>
        </table>
        {/* buttons for prev and next page navigation */}
        <div className="button_group">
          <Button
            onClick={previousPage}
            disabled={currentPage === 1 || isPrevPageLoading}
          >
            {isPrevPageLoading ? (
              <>
                <Spinner size="small" />
              </>
            ) : (
              "<<"
            )}
          </Button>
          <Button
            onClick={nextPage}
            disabled={responseData.length < 10 || isNextPageLoading}
          >
            {isNextPageLoading ? (
              <>
                <Spinner size="small" />
              </>
            ) : (
              ">>"
            )}
          </Button>
        </div>

        {isProgressBarVisible && (
          <div className="progress-bar-popup">
            <div className="progress-bar-container">
              <ProgressBar progress={progress} animated={false} />
              <span>{progress}%</span>
            </div>
          </div>
        )}
      </LegacyCard>

      {/* Email Editing Modal */}
      <Modal
        small
        open={isEmailModalOpen}
        onClose={closeModal}
        className="details_inner"
        title="Confirm resending mail"
        primaryAction={{
          content: "Cancel",
          onAction: closeModal,
        }}
        secondaryActions={[
          {
            content: isResendEmailLoading ? (
              <>
                <span>SENDING...</span> <Spinner size="small" />
              </>
            ) : (
              "RESEND MAIL"
            ),
            onAction: handleResendMail,
          },
        ]}
      >
        <Modal.Section>
          {isEmailModalOpen && (
            <div className="modal_email_section">
              <div>
                <h2
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    marginTop: "0",
                    marginLeft: "0",
                    marginBottom: "22px",
                  }}
                >
                  Edit Customer mail
                </h2>
              </div>
              CUSTOMER EMAIL
              <span>
                <input
                  value={editedEmail}
                  onChange={handleEmailChange}
                  style={{ marginLeft: "5px" }}
                />
              </span>
            </div>
          )}
        </Modal.Section>
      </Modal>
      {/* Esim Duplicate Values Modal */}
      <Modal
        small
        open={isDuplicateValuesModalOpen}
        onClose={closeDuplicateValuesModal}
        title="Duplicate Data Of Excel Sheet"
        primaryAction={{
          content: "Cancel",
          onAction: closeDuplicateValuesModal,
        }}
      >
        <Modal.Section>
          {isDuplicateValuesModalOpen && (
            <>
              <h2 style={{ fontWeight: "bold", margin: "10px 0 5px 0" }}>
                Duplicate eSim ICCID's
              </h2>
              {duplicateValues.map((item, index) => (
                <div key={index} style={{ display: "flex", margin: "10px" }}>
                  <Text>{item.matchingVariant}</Text>
                </div>
              ))}
            </>
          )}
        </Modal.Section>
      </Modal>
    </>
  );
}
